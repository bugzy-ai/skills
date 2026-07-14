#!/usr/bin/env node
"use strict";

// src/api-client.ts
var DEFAULT_API_VERSION = "7.1";
var DEFAULT_TIMEOUT = 3e4;
var MAX_RETRIES = 3;
var MAX_BATCH_SIZE = 200;
var AzureDevOpsError = class extends Error {
  constructor(message, statusCode, isRetryable) {
    super(message);
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.name = "AzureDevOpsError";
  }
};
function getConfig() {
  const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
  if (!orgUrl) {
    throw new Error(
      "AZURE_DEVOPS_ORG_URL environment variable is required. Set it to your Azure DevOps organization URL (e.g., https://dev.azure.com/my-org)."
    );
  }
  const pat = process.env.AZURE_DEVOPS_PAT;
  if (!pat) {
    throw new Error(
      "AZURE_DEVOPS_PAT environment variable is required. Set it to your Azure DevOps Personal Access Token."
    );
  }
  const trimmedOrgUrl = orgUrl.trim();
  const normalizedOrgUrl = /^https?:\/\//i.test(trimmedOrgUrl) ? trimmedOrgUrl : `https://${trimmedOrgUrl}`;
  let parsedOrgUrl;
  try {
    parsedOrgUrl = new URL(normalizedOrgUrl);
  } catch {
    throw new Error("AZURE_DEVOPS_ORG_URL must be a valid Azure DevOps organization URL.");
  }
  const isAzureHost = parsedOrgUrl.hostname === "dev.azure.com" || parsedOrgUrl.hostname.endsWith(".visualstudio.com");
  if (parsedOrgUrl.protocol !== "https:" || !isAzureHost) {
    throw new Error("AZURE_DEVOPS_ORG_URL must use HTTPS on dev.azure.com or an organization.visualstudio.com host.");
  }
  return { orgUrl: normalizedOrgUrl.replace(/\/+$/, ""), pat };
}
function getBackoffDelay(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) return seconds * 1e3;
  }
  return Math.min(1e3 * Math.pow(2, attempt), 3e4);
}
async function request(method, endpoint, options) {
  const result = await requestWithMeta(method, endpoint, options);
  return result.body;
}
async function requestWithMeta(method, endpoint, options) {
  const config = options?.config ?? getConfig();
  const apiVersion = options?.apiVersion ?? DEFAULT_API_VERSION;
  const authHeader = `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`;
  const baseUrl = options?.project ? `${config.orgUrl}/${encodeURIComponent(options.project)}` : config.orgUrl;
  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `${baseUrl}/_apis/${endpoint}${separator}api-version=${apiVersion}`;
  const contentType = options?.contentType ?? "application/json";
  const headers = {
    Authorization: authHeader,
    Accept: "application/json",
    "Content-Type": contentType
  };
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout ?? DEFAULT_TIMEOUT);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body === void 0 ? void 0 : JSON.stringify(options.body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const continuationToken = response.headers?.get?.("x-ms-continuationtoken") ?? void 0;
        if (response.status === 204) return { body: {}, continuationToken };
        return { body: await response.json(), continuationToken };
      }
      const isRetryable = response.status === 429 || response.status >= 500;
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt, response.headers?.get?.("Retry-After"));
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      let errorMessage = `Azure DevOps API error ${response.status}`;
      try {
        const errorBody = await response.json();
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
      }
      if (response.status === 401) {
        errorMessage = "Authentication failed (401). Your Azure DevOps PAT is invalid or expired.";
      } else if (response.status === 403 && (options?.permissionHint || isTestManagementEndpoint(endpoint))) {
        errorMessage = options?.permissionHint ? `Permission denied (403). ${options.permissionHint}` : "Permission denied (403) for Azure DevOps Test Management endpoint. Verify the PAT has Test Management read/write permissions and project access.";
      }
      throw new AzureDevOpsError(sanitizeMessage(errorMessage, config.pat), response.status, isRetryable);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AzureDevOpsError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AzureDevOpsError(
          `Request timed out after ${(config.timeout ?? DEFAULT_TIMEOUT) / 1e3}s`,
          0,
          true
        );
      }
      if (attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new AzureDevOpsError(
        sanitizeMessage(`Network error: ${error instanceof Error ? error.message : String(error)}`, config.pat),
        0,
        true
      );
    }
  }
  throw new AzureDevOpsError("Max retries exceeded", 0, true);
}
function sanitizeMessage(message, pat) {
  return pat ? message.split(pat).join("[redacted]") : message;
}
function isTestManagementEndpoint(endpoint) {
  const lower = endpoint.toLowerCase();
  return lower.startsWith("testplan/") || lower.startsWith("test/runs") || lower.includes("/results");
}
async function listProjects(options) {
  const params = [];
  if (options?.top) params.push(`$top=${options.top}`);
  if (options?.skip) params.push(`$skip=${options.skip}`);
  const endpoint = `projects${params.length ? "?" + params.join("&") : ""}`;
  const result = await request("GET", endpoint, {
    config: options?.config
  });
  return result.value;
}
async function wiqlQuery(wiql, project, options) {
  const params = options?.top ? `?$top=${options.top}` : "";
  return request("POST", `wit/wiql${params}`, {
    body: { query: wiql },
    project,
    config: options?.config
  });
}
async function getWorkItemsBatch(ids, project, options) {
  if (ids.length === 0) return [];
  const batches = [];
  for (let i = 0; i < ids.length; i += MAX_BATCH_SIZE) {
    batches.push(ids.slice(i, i + MAX_BATCH_SIZE));
  }
  const results = await Promise.all(
    batches.map(async (batch) => {
      const params = [`ids=${batch.join(",")}`];
      if (options?.fields) params.push(`fields=${options.fields}`);
      if (options?.expand) params.push(`$expand=${options.expand}`);
      const endpoint = `wit/workitems?${params.join("&")}`;
      const result = await request("GET", endpoint, {
        project,
        config: options?.config
      });
      return result.value;
    })
  );
  return results.flat();
}
async function searchWorkItems(wiql, project, options) {
  const queryResult = await wiqlQuery(wiql, project, {
    top: options?.top,
    config: options?.config
  });
  const ids = queryResult.workItems.map((wi) => wi.id);
  const workItems = await getWorkItemsBatch(ids, project, {
    fields: options?.fields,
    config: options?.config
  });
  return { queryResult, workItems };
}
async function getWorkItem(id, project, options) {
  const params = [];
  if (options?.fields) params.push(`fields=${options.fields}`);
  if (options?.expand) params.push(`$expand=${options.expand}`);
  const endpoint = `wit/workitems/${id}${params.length ? "?" + params.join("&") : ""}`;
  return request("GET", endpoint, {
    project,
    config: options?.config,
    permissionHint: options?.permissionHint
  });
}
async function createWorkItem(type, operations, project, options) {
  return request("POST", `wit/workitems/$${encodeURIComponent(type)}`, {
    body: operations,
    contentType: "application/json-patch+json",
    project,
    config: options?.config,
    permissionHint: options?.permissionHint
  });
}
async function updateWorkItem(id, operations, project, options) {
  return request("PATCH", `wit/workitems/${id}`, {
    body: operations,
    contentType: "application/json-patch+json",
    project,
    config: options?.config,
    permissionHint: options?.permissionHint
  });
}
async function addComment(id, text, project, options) {
  return request("POST", `wit/workitems/${id}/comments`, {
    body: { text },
    project,
    apiVersion: "7.1-preview.4",
    config: options?.config
  });
}
function buildJsonPatch(fields) {
  const FIELD_MAP = {
    title: "/fields/System.Title",
    description: "/fields/System.Description",
    state: "/fields/System.State",
    "assigned-to": "/fields/System.AssignedTo",
    assignee: "/fields/System.AssignedTo",
    "area-path": "/fields/System.AreaPath",
    "iteration-path": "/fields/System.IterationPath",
    priority: "/fields/Microsoft.VSTS.Common.Priority",
    severity: "/fields/Microsoft.VSTS.Common.Severity",
    tags: "/fields/System.Tags"
  };
  const ops = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === void 0 || value === null) continue;
    const path = FIELD_MAP[key] ?? `/fields/${key}`;
    ops.push({ op: "add", path, value });
  }
  return ops;
}
function getBaseUrl(config) {
  return (config ?? getConfig()).orgUrl;
}

// src/commands/list-projects.ts
async function listProjectsCommand(options) {
  const projects = await listProjects({
    top: options.top ? parseInt(options.top, 10) : void 0,
    skip: options.skip ? parseInt(options.skip, 10) : void 0
  });
  console.log(JSON.stringify({ projects }, null, 2));
}

// src/commands/search.ts
function buildWiql(options) {
  const query = options.query ?? "";
  if (query.trimStart().toUpperCase().startsWith("SELECT")) {
    return query;
  }
  const conditions = [];
  if (query) {
    conditions.push(`[System.Title] CONTAINS '${query.replace(/'/g, "''")}'`);
  }
  if (options.type) {
    conditions.push(`[System.WorkItemType] = '${options.type.replace(/'/g, "''")}'`);
  }
  if (options.state) {
    conditions.push(`[System.State] = '${options.state.replace(/'/g, "''")}'`);
  }
  if (options.areaPath) {
    conditions.push(`[System.AreaPath] UNDER '${options.areaPath.replace(/'/g, "''")}'`);
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo] FROM WorkItems${where} ORDER BY [System.CreatedDate] DESC`;
}
async function searchCommand(options) {
  if (!options.project) {
    throw new Error("--project is required for work-item search");
  }
  const wiql = buildWiql(options);
  const top = options.top ? parseInt(options.top, 10) : 50;
  const result = await searchWorkItems(wiql, options.project, { top });
  console.log(JSON.stringify(result, null, 2));
}

// src/commands/get.ts
async function getCommand(id, options) {
  if (!id) {
    throw new Error("Work item ID is required");
  }
  if (!options.project) {
    throw new Error("--project is required for work-item get");
  }
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error(`Invalid work item ID: ${id}`);
  }
  const workItem = await getWorkItem(numId, options.project, {
    fields: options.fields,
    expand: options.expand
  });
  console.log(JSON.stringify(workItem, null, 2));
}

// src/commands/create.ts
async function createCommand(options) {
  if (!options.project) {
    throw new Error("--project is required for work-item create");
  }
  if (!options.type) {
    throw new Error("--type is required for work-item create");
  }
  if (!options.title) {
    throw new Error("--title is required for work-item create");
  }
  const fields = {
    title: options.title
  };
  if (options.description) fields.description = options.description;
  if (options.areaPath) fields["area-path"] = options.areaPath;
  if (options.iterationPath) fields["iteration-path"] = options.iterationPath;
  if (options.assignedTo) fields["assigned-to"] = options.assignedTo;
  if (options.priority) fields.priority = parseInt(options.priority, 10);
  if (options.severity) fields.severity = options.severity;
  if (options.tags) fields.tags = options.tags;
  const operations = buildJsonPatch(fields);
  if (options.parentId) {
    const baseUrl = getBaseUrl();
    operations.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `${baseUrl}/_apis/wit/workitems/${options.parentId}`,
        attributes: { comment: "Parent link" }
      }
    });
  }
  const workItem = await createWorkItem(options.type, operations, options.project);
  console.log(JSON.stringify(workItem, null, 2));
}

// src/commands/update.ts
async function updateCommand(id, options) {
  if (!id) {
    throw new Error("Work item ID is required");
  }
  if (!options.project) {
    throw new Error("--project is required for work-item update");
  }
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error(`Invalid work item ID: ${id}`);
  }
  let ops;
  if (options.operations) {
    ops = JSON.parse(options.operations);
  } else {
    const fields = {};
    if (options.state) fields.state = options.state;
    if (options.assignee) fields.assignee = options.assignee;
    if (options.priority) fields.priority = parseInt(options.priority, 10);
    if (options.title) fields.title = options.title;
    if (options.tags) fields.tags = options.tags;
    if (options.severity) fields.severity = options.severity;
    ops = buildJsonPatch(fields);
    if (ops.length === 0) {
      throw new Error("At least one field to update is required (--state, --title, --assignee, --priority, --tags, --severity, or --operations)");
    }
  }
  const workItem = await updateWorkItem(numId, ops, options.project);
  console.log(JSON.stringify(workItem, null, 2));
}

// src/commands/comment.ts
async function commentCommand(id, options) {
  if (!id) {
    throw new Error("Work item ID is required");
  }
  if (!options.project) {
    throw new Error("--project is required for work-item comment");
  }
  if (!options.body) {
    throw new Error("--body is required for work-item comment");
  }
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error(`Invalid work item ID: ${id}`);
  }
  const comment = await addComment(numId, options.body, options.project);
  console.log(JSON.stringify(comment, null, 2));
}

// src/commands/tcms-common.ts
var RESULT_OUTCOMES = /* @__PURE__ */ new Set([
  "Unspecified",
  "None",
  "Passed",
  "Failed",
  "Inconclusive",
  "Timeout",
  "Aborted",
  "Blocked",
  "NotExecuted",
  "Warning",
  "Error",
  "NotApplicable",
  "Paused",
  "InProgress",
  "NotImpacted"
]);
function requireProject(project, command) {
  if (!project) throw new Error(`--project is required for ${command}`);
}
function parsePositiveId(value, name) {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}
function parseOptionalPositiveInt(value, name) {
  if (value === void 0) return void 0;
  return parsePositiveId(value, name);
}
function parseOptionalNonNegativeInt(value, name) {
  if (value === void 0) return void 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}
function parseIdList(value, name) {
  if (!value) throw new Error(`${name} is required`);
  const ids = value.split(",").map((item) => parsePositiveId(item.trim(), name));
  return Array.from(new Set(ids));
}
function parseBoolean(value, name) {
  if (value === void 0) return void 0;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}
function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== void 0) query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}
function parseJsonArray(value, name) {
  if (!value) throw new Error(`${name} is required`);
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error(`${name} must be a non-empty JSON array of objects`);
  }
  return parsed;
}
function parseManualSteps(value) {
  return parseJsonArray(value, "--steps").map((step, index) => {
    if (typeof step.action !== "string" || step.action.trim().length === 0) {
      throw new Error(`--steps item ${index + 1} requires a non-empty action`);
    }
    if (typeof step.expected !== "string") {
      throw new Error(`--steps item ${index + 1} requires an expected string`);
    }
    return { action: step.action, expected: step.expected };
  });
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/\r?\n/g, "&lt;br/&gt;");
}
function serializeManualSteps(steps) {
  const serialized = steps.map((step, index) => `<step id="${index + 2}" type="ActionStep"><parameterizedString isformatted="true">&lt;DIV&gt;${escapeXml(step.action)}&lt;/DIV&gt;</parameterizedString><parameterizedString isformatted="true">&lt;DIV&gt;${escapeXml(step.expected)}&lt;/DIV&gt;</parameterizedString><description/></step>`).join("");
  return `<steps id="0" last="${steps.length + 1}">${serialized}</steps>`;
}
function decodeXml(value) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function decodeStepText(value) {
  return decodeXml(value).replace(/^<DIV>/i, "").replace(/<\/DIV>$/i, "").replace(/<br\s*\/>/gi, "\n");
}
function deserializeManualSteps(value) {
  return Array.from(value.matchAll(/<step\b[^>]*>([\s\S]*?)<\/step>/gi)).map((step) => {
    const values = Array.from(step[1].matchAll(/<parameterizedString\b[^>]*>([\s\S]*?)<\/parameterizedString>/gi));
    return {
      action: decodeStepText(values[0]?.[1] ?? ""),
      expected: decodeStepText(values[1]?.[1] ?? "")
    };
  });
}
function parseResultInputs(value, requireId) {
  return parseJsonArray(value, "--results").map((result, index) => {
    const output = {};
    for (const field of ["comment", "errorMessage", "startedDate", "completedDate", "testCaseTitle", "state"]) {
      if (result[field] !== void 0) {
        if (typeof result[field] !== "string") throw new Error(`--results item ${index + 1} ${field} must be a string`);
        output[field] = result[field];
      }
    }
    for (const field of ["id", "testPointId", "testCaseId"]) {
      if (result[field] !== void 0) {
        if (typeof result[field] !== "number" || !Number.isInteger(result[field]) || result[field] <= 0) {
          throw new Error(`--results item ${index + 1} ${field} must be a positive integer`);
        }
        output[field] = result[field];
      }
    }
    if (result.durationMs !== void 0) {
      if (typeof result.durationMs !== "number" || !Number.isFinite(result.durationMs) || result.durationMs < 0) {
        throw new Error(`--results item ${index + 1} durationMs must be a non-negative number`);
      }
      output.durationMs = result.durationMs;
    }
    if (result.outcome !== void 0) {
      if (typeof result.outcome !== "string" || !RESULT_OUTCOMES.has(result.outcome)) {
        throw new Error(`--results item ${index + 1} has an unsupported outcome`);
      }
      output.outcome = result.outcome;
    }
    if (requireId && (!output.id || !Number.isInteger(output.id))) {
      throw new Error(`--results item ${index + 1} requires a positive integer id`);
    }
    if (!requireId && output.testPointId === void 0 && output.testCaseId === void 0 && !output.testCaseTitle) {
      throw new Error(`--results item ${index + 1} requires testPointId, testCaseId, or testCaseTitle`);
    }
    return output;
  });
}
function toAzureResult(input) {
  return {
    ...input.id !== void 0 ? { id: input.id } : {},
    ...input.testPointId !== void 0 ? { testPoint: { id: String(input.testPointId) } } : {},
    ...input.testCaseId !== void 0 ? { testCase: { id: String(input.testCaseId) } } : {},
    ...input.testCaseTitle ? { testCaseTitle: input.testCaseTitle } : {},
    ...input.outcome ? { outcome: input.outcome } : {},
    ...input.state ? { state: input.state } : input.outcome ? { state: "Completed" } : {},
    ...input.durationMs !== void 0 ? { durationInMs: input.durationMs } : {},
    ...input.comment !== void 0 ? { comment: input.comment } : {},
    ...input.errorMessage !== void 0 ? { errorMessage: input.errorMessage } : {},
    ...input.startedDate ? { startedDate: input.startedDate } : {},
    ...input.completedDate ? { completedDate: input.completedDate } : {}
  };
}
function linkHref(resource, keys) {
  for (const key of keys) {
    const href = resource._links?.[key]?.href ?? resource.links?.[key]?.href;
    if (typeof href === "string" && href.length > 0) return href;
  }
  return void 0;
}
function compactWorkItemFields(value) {
  const fields = Object.assign({}, ...value.filter((item) => item && typeof item === "object" && !Array.isArray(item)));
  const steps = fields["Microsoft.VSTS.TCM.Steps"];
  return {
    ...fields["System.State"] !== void 0 ? { state: fields["System.State"] } : {},
    ...fields["System.WorkItemType"] !== void 0 ? { type: fields["System.WorkItemType"] } : {},
    ...fields["System.Rev"] !== void 0 ? { revision: fields["System.Rev"] } : {},
    ...fields["Microsoft.VSTS.Common.Priority"] !== void 0 ? { priority: fields["Microsoft.VSTS.Common.Priority"] } : {},
    ...fields["Microsoft.VSTS.TCM.AutomationStatus"] !== void 0 ? { automationStatus: fields["Microsoft.VSTS.TCM.AutomationStatus"] } : {},
    ...typeof steps === "string" ? { steps: deserializeManualSteps(steps) } : {}
  };
}
function compactValue(value, key) {
  if (Array.isArray(value)) {
    if (key === "workItemFields") return compactWorkItemFields(value);
    return value.map((item) => compactValue(item));
  }
  if (!value || typeof value !== "object") return value;
  const record = value;
  if (typeof record.displayName === "string" && (record.descriptor || record.uniqueName || record.imageUrl)) {
    return {
      ...record.id !== void 0 ? { id: record.id } : {},
      displayName: record.displayName
    };
  }
  return Object.fromEntries(
    Object.entries(record).map(([childKey, child]) => [childKey, compactValue(child, childKey)])
  );
}
function normalizeResource(resource, fallbackWebUrl) {
  const url = resource.url ?? linkHref(resource, ["_self", "self"]);
  const webUrl = resource.webAccessUrl ?? resource.webAccessUri ?? linkHref(resource, ["web", "html"]);
  return {
    ...compactValue(resource),
    ...url ? { url } : {},
    ...webUrl && /^https?:\/\//i.test(webUrl) ? { webUrl } : fallbackWebUrl ? { webUrl: fallbackWebUrl } : {}
  };
}
function normalizeResourceTree(resource, fallbackWebUrl) {
  const normalized = normalizeResource(resource, fallbackWebUrl?.(resource));
  if (Array.isArray(resource.children)) {
    normalized.children = resource.children.map((child) => normalizeResourceTree(child, fallbackWebUrl));
  }
  return normalized;
}
function normalizeList(response, continuationToken, fallbackWebUrl) {
  const value = Array.isArray(response) ? response : response.value;
  const count = Array.isArray(response) ? value.length : response.count ?? value.length;
  return {
    count,
    value: value.map((resource) => normalizeResourceTree(resource, fallbackWebUrl)),
    ...continuationToken ? { continuationToken } : {}
  };
}
function projectWebRoot(project) {
  return `${getConfig().orgUrl}/${encodeURIComponent(project)}`;
}
function resourceId(resource) {
  if (typeof resource.id === "number" || typeof resource.id === "string") return resource.id;
  const workItem = resource.workItem;
  if (!workItem || typeof workItem !== "object" || Array.isArray(workItem)) return void 0;
  const id = workItem.id;
  return typeof id === "number" || typeof id === "string" ? id : void 0;
}
function planWebUrl(project, resource) {
  const id = resourceId(resource);
  return id === void 0 ? void 0 : `${projectWebRoot(project)}/_testPlans/define?planId=${id}`;
}
function suiteWebUrl(project, planId, resource) {
  const id = resourceId(resource);
  return id === void 0 ? void 0 : `${projectWebRoot(project)}/_testPlans/define?planId=${planId}&suiteId=${id}`;
}
function workItemWebUrl(project, resource) {
  const id = resourceId(resource);
  return id === void 0 ? void 0 : `${projectWebRoot(project)}/_workitems/edit/${id}`;
}
function runWebUrl(project, resource) {
  const id = resourceId(resource);
  return id === void 0 ? void 0 : `${projectWebRoot(project)}/_TestManagement/Runs?runId=${id}`;
}

// src/commands/test-plans.ts
async function testPlanCommand(action, id, options) {
  requireProject(options.project, `test-plan ${action}`);
  if (action === "list") {
    const query = buildQuery({
      owner: options.owner,
      continuationToken: options.continuationToken,
      includePlanDetails: parseBoolean(options.includeDetails, "--include-details"),
      filterActivePlans: parseBoolean(options.activeOnly, "--active-only")
    });
    const response = await requestWithMeta("GET", `testplan/plans${query}`, {
      project: options.project
    });
    console.log(JSON.stringify(normalizeList(response.body, response.continuationToken, (plan) => planWebUrl(options.project, plan)), null, 2));
    return;
  }
  if (action === "get") {
    const planId = parsePositiveId(id, "Test plan ID");
    const plan = await request("GET", `testplan/plans/${planId}`, {
      project: options.project
    });
    console.log(JSON.stringify(normalizeResource(plan, planWebUrl(options.project, plan)), null, 2));
    return;
  }
  if (action === "create") {
    if (!options.name) throw new Error("--name is required for test-plan create");
    const plan = await request("POST", "testplan/plans", {
      project: options.project,
      body: {
        name: options.name,
        areaPath: options.areaPath ?? options.project,
        iteration: options.iteration ?? options.project,
        owner: options.owner ? { id: options.owner } : null,
        ...options.description ? { description: options.description } : {},
        ...options.state ? { state: options.state } : {},
        ...options.startDate ? { startDate: options.startDate } : {},
        ...options.endDate ? { endDate: options.endDate } : {}
      }
    });
    console.log(JSON.stringify(normalizeResource(plan, planWebUrl(options.project, plan)), null, 2));
    return;
  }
  if (action === "update") {
    const planId = parsePositiveId(id, "Test plan ID");
    const body = {
      ...options.name ? { name: options.name } : {},
      ...options.areaPath ? { areaPath: options.areaPath } : {},
      ...options.iteration ? { iteration: options.iteration } : {},
      ...options.description !== void 0 ? { description: options.description } : {},
      ...options.state ? { state: options.state } : {},
      ...options.startDate ? { startDate: options.startDate } : {},
      ...options.endDate ? { endDate: options.endDate } : {},
      ...options.owner ? { owner: { id: options.owner } } : {}
    };
    if (Object.keys(body).length === 0) throw new Error("At least one test plan field to update is required");
    const plan = await request("PATCH", `testplan/plans/${planId}`, {
      project: options.project,
      body
    });
    console.log(JSON.stringify(normalizeResource(plan, planWebUrl(options.project, plan)), null, 2));
    return;
  }
  throw new Error(`Unknown action: test-plan ${action || "(none)"}`);
}

// src/commands/test-suites.ts
var SUITE_TYPES = /* @__PURE__ */ new Set(["staticTestSuite", "dynamicTestSuite", "requirementTestSuite"]);
async function testSuiteCommand(action, id, options) {
  requireProject(options.project, `test-suite ${action}`);
  const planId = parsePositiveId(options.planId, "--plan-id");
  if (action === "list") {
    const query = buildQuery({
      expand: options.expand,
      continuationToken: options.continuationToken,
      asTreeView: parseBoolean(options.tree, "--tree")
    });
    const response = await requestWithMeta(
      "GET",
      `testplan/Plans/${planId}/suites${query}`,
      { project: options.project }
    );
    console.log(JSON.stringify(normalizeList(response.body, response.continuationToken, (suite) => suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }
  const suiteId = action === "create" ? void 0 : parsePositiveId(id, "Test suite ID");
  if (action === "get") {
    const suite = await request("GET", `testplan/Plans/${planId}/suites/${suiteId}`, {
      project: options.project
    });
    console.log(JSON.stringify(normalizeResource(suite, suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }
  if (action === "create") {
    if (!options.name) throw new Error("--name is required for test-suite create");
    const parentSuiteId = parsePositiveId(options.parentSuiteId, "--parent-suite-id");
    const suiteType = options.suiteType ?? "staticTestSuite";
    if (!SUITE_TYPES.has(suiteType)) throw new Error("--suite-type must be staticTestSuite, dynamicTestSuite, or requirementTestSuite");
    if (suiteType === "dynamicTestSuite" && !options.query) throw new Error("--query is required for a dynamicTestSuite");
    if (suiteType === "requirementTestSuite" && !options.requirementId) throw new Error("--requirement-id is required for a requirementTestSuite");
    const configurationIds = options.configurationIds ? parseIdList(options.configurationIds, "--configuration-ids") : [];
    const suite = await request("POST", `testplan/Plans/${planId}/suites`, {
      project: options.project,
      body: {
        name: options.name,
        suiteType,
        parentSuite: { id: parentSuiteId },
        inheritDefaultConfigurations: parseBoolean(options.inheritConfigurations, "--inherit-configurations") ?? configurationIds.length === 0,
        ...configurationIds.length > 0 ? { defaultConfigurations: configurationIds.map((configurationId) => ({ id: configurationId })) } : {},
        ...options.query ? { queryString: options.query } : {},
        ...options.requirementId ? { requirementId: parsePositiveId(options.requirementId, "--requirement-id") } : {}
      }
    });
    console.log(JSON.stringify(normalizeResource(suite, suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }
  if (action === "update") {
    const body = {
      ...options.name ? { name: options.name } : {},
      ...options.parentSuiteId ? { parentSuite: { id: parsePositiveId(options.parentSuiteId, "--parent-suite-id") } } : {},
      ...options.query !== void 0 ? { queryString: options.query } : {},
      ...options.revision ? { revision: parsePositiveId(options.revision, "--revision") } : {},
      ...options.inheritConfigurations !== void 0 ? {
        inheritDefaultConfigurations: parseBoolean(options.inheritConfigurations, "--inherit-configurations")
      } : {},
      ...options.configurationIds ? {
        defaultConfigurations: parseIdList(options.configurationIds, "--configuration-ids").map((configurationId) => ({ id: configurationId }))
      } : {}
    };
    if (Object.keys(body).length === 0) throw new Error("At least one test suite field to update is required");
    const suite = await request("PATCH", `testplan/Plans/${planId}/suites/${suiteId}`, {
      project: options.project,
      body
    });
    console.log(JSON.stringify(normalizeResource(suite, suiteWebUrl(options.project, planId, suite)), null, 2));
    return;
  }
  if (action === "add-cases") {
    const caseIds = parseIdList(options.caseIds, "--case-ids");
    const configurationIds = options.configurationIds ? parseIdList(options.configurationIds, "--configuration-ids") : [];
    const response = await request("POST", `testplan/Plans/${planId}/Suites/${suiteId}/TestCase`, {
      project: options.project,
      body: caseIds.map((caseId) => ({
        workItem: { id: caseId },
        ...configurationIds.length > 0 ? {
          pointAssignments: configurationIds.map((configurationId) => ({ configurationId }))
        } : {}
      }))
    });
    console.log(JSON.stringify(normalizeList(response, void 0, (testCase) => workItemWebUrl(options.project, testCase)), null, 2));
    return;
  }
  if (action === "remove-cases") {
    const caseIds = parseIdList(options.caseIds, "--case-ids");
    await request("DELETE", `testplan/Plans/${planId}/Suites/${suiteId}/TestCase${buildQuery({ testCaseIds: caseIds.join(",") })}`, {
      project: options.project
    });
    console.log(JSON.stringify({ planId, suiteId, removedTestCaseIds: caseIds }, null, 2));
    return;
  }
  throw new Error(`Unknown action: test-suite ${action || "(none)"}`);
}

// src/commands/test-cases.ts
var TEST_CASE_PERMISSION_HINT = "The PAT needs Azure DevOps Test Management read/write permission and access to Test Case work items.";
function summarizeTestCase(testCase) {
  const steps = testCase.fields["Microsoft.VSTS.TCM.Steps"];
  return {
    id: testCase.id,
    revision: testCase.rev,
    type: testCase.fields["System.WorkItemType"],
    title: testCase.fields["System.Title"],
    state: testCase.fields["System.State"],
    areaPath: testCase.fields["System.AreaPath"],
    iterationPath: testCase.fields["System.IterationPath"],
    priority: testCase.fields["Microsoft.VSTS.Common.Priority"],
    tags: testCase.fields["System.Tags"],
    ...typeof steps === "string" ? { steps: deserializeManualSteps(steps) } : {},
    ...testCase.relations ? { relations: testCase.relations } : {},
    url: testCase.url,
    _links: testCase._links
  };
}
function testCasePatch(options) {
  const fields = {};
  if (options.title) fields.title = options.title;
  if (options.steps) fields["Microsoft.VSTS.TCM.Steps"] = serializeManualSteps(parseManualSteps(options.steps));
  if (options.priority) fields.priority = parsePositiveId(options.priority, "--priority");
  if (options.areaPath) fields["area-path"] = options.areaPath;
  if (options.iterationPath) fields["iteration-path"] = options.iterationPath;
  if (options.tags) fields.tags = options.tags;
  if (options.state) fields.state = options.state;
  return buildJsonPatch(fields);
}
async function testCaseCommand(action, id, options) {
  requireProject(options.project, `test-case ${action}`);
  if (action === "list") {
    const planId = parsePositiveId(options.planId, "--plan-id");
    const suiteId = parsePositiveId(options.suiteId, "--suite-id");
    const response = await requestWithMeta(
      "GET",
      `testplan/Plans/${planId}/Suites/${suiteId}/TestCase${buildQuery({
        configurationIds: options.configurationIds,
        continuationToken: options.continuationToken
      })}`,
      { project: options.project }
    );
    console.log(JSON.stringify(normalizeList(
      response.body,
      response.continuationToken,
      (testCase) => workItemWebUrl(options.project, testCase)
    ), null, 2));
    return;
  }
  if (action === "get") {
    const caseId = parsePositiveId(id, "Test Case ID");
    const testCase = await getWorkItem(caseId, options.project, {
      fields: "System.Id,System.Title,System.State,System.WorkItemType,System.AreaPath,System.IterationPath,System.Tags,Microsoft.VSTS.Common.Priority,Microsoft.VSTS.TCM.Steps",
      expand: "Links",
      permissionHint: TEST_CASE_PERMISSION_HINT
    });
    const resource = summarizeTestCase(testCase);
    console.log(JSON.stringify(normalizeResource(resource, workItemWebUrl(options.project, resource)), null, 2));
    return;
  }
  if (action === "create") {
    if (!options.title) throw new Error("--title is required for test-case create");
    if (!options.steps) throw new Error("--steps is required for test-case create");
    const testCase = await createWorkItem("Test Case", testCasePatch(options), options.project, {
      permissionHint: TEST_CASE_PERMISSION_HINT
    });
    const resource = summarizeTestCase(testCase);
    console.log(JSON.stringify(normalizeResource(resource, workItemWebUrl(options.project, resource)), null, 2));
    return;
  }
  if (action === "update") {
    const caseId = parsePositiveId(id, "Test Case ID");
    parseOptionalPositiveInt(options.priority, "--priority");
    const operations = testCasePatch(options);
    if (operations.length === 0) throw new Error("At least one Test Case field to update is required");
    const testCase = await updateWorkItem(caseId, operations, options.project, {
      permissionHint: TEST_CASE_PERMISSION_HINT
    });
    const resource = summarizeTestCase(testCase);
    console.log(JSON.stringify(normalizeResource(resource, workItemWebUrl(options.project, resource)), null, 2));
    return;
  }
  throw new Error(`Unknown action: test-case ${action || "(none)"}`);
}

// src/commands/test-points.ts
async function testPointCommand(action, options) {
  if (action !== "list") throw new Error(`Unknown action: test-point ${action || "(none)"}`);
  requireProject(options.project, "test-point list");
  const planId = parsePositiveId(options.planId, "--plan-id");
  const suiteId = parsePositiveId(options.suiteId, "--suite-id");
  const response = await requestWithMeta(
    "GET",
    `testplan/Plans/${planId}/Suites/${suiteId}/TestPoint${buildQuery({
      testCaseId: options.caseId,
      testPointIds: options.pointIds,
      continuationToken: options.continuationToken,
      includePointDetails: parseBoolean(options.includeDetails, "--include-details"),
      isRecursive: parseBoolean(options.recursive, "--recursive")
    })}`,
    { project: options.project }
  );
  console.log(JSON.stringify(normalizeList(
    response.body,
    response.continuationToken,
    () => suiteWebUrl(options.project, planId, { id: suiteId })
  ), null, 2));
}

// src/commands/test-runs.ts
async function testRunCommand(action, id, options) {
  requireProject(options.project, `test-run ${action}`);
  if (action === "list") {
    const response = await request("GET", `test/runs${buildQuery({
      planId: options.planId,
      minLastUpdatedDate: options.minLastUpdated,
      maxLastUpdatedDate: options.maxLastUpdated,
      "$top": parseOptionalPositiveInt(options.top, "--top"),
      "$skip": parseOptionalNonNegativeInt(options.skip, "--skip")
    })}`, { project: options.project });
    console.log(JSON.stringify(normalizeList(response, void 0, (run) => runWebUrl(options.project, run)), null, 2));
    return;
  }
  if (action === "create") {
    if (!options.name) throw new Error("--name is required for test-run create");
    const planId = parsePositiveId(options.planId, "--plan-id");
    const pointIds = parseIdList(options.pointIds, "--point-ids");
    const run = await request("POST", "test/runs", {
      project: options.project,
      body: {
        name: options.name,
        plan: { id: String(planId) },
        pointIds,
        automated: parseBoolean(options.automated, "--automated") ?? false,
        ...options.comment ? { comment: options.comment } : {}
      }
    });
    console.log(JSON.stringify(normalizeResource(run, runWebUrl(options.project, run)), null, 2));
    return;
  }
  const runId = parsePositiveId(id, "Test run ID");
  if (action === "get") {
    const run = await request("GET", `test/runs/${runId}`, {
      project: options.project
    });
    console.log(JSON.stringify(normalizeResource(run, runWebUrl(options.project, run)), null, 2));
    return;
  }
  if (action === "complete") {
    const run = await request("PATCH", `test/runs/${runId}`, {
      project: options.project,
      body: {
        state: "Completed",
        completedDate: options.completedDate ?? (/* @__PURE__ */ new Date()).toISOString(),
        ...options.comment ? { comment: options.comment } : {}
      }
    });
    console.log(JSON.stringify(normalizeResource(run, runWebUrl(options.project, run)), null, 2));
    return;
  }
  throw new Error(`Unknown action: test-run ${action || "(none)"}`);
}

// src/commands/test-results.ts
async function testResultCommand(action, id, options) {
  requireProject(options.project, `test-result ${action}`);
  const runId = parsePositiveId(options.runId, "--run-id");
  if (action === "list") {
    const response = await request("GET", `test/Runs/${runId}/results${buildQuery({
      detailsToInclude: options.details,
      outcomes: options.outcomes,
      "$top": parseOptionalPositiveInt(options.top, "--top"),
      "$skip": parseOptionalNonNegativeInt(options.skip, "--skip")
    })}`, { project: options.project });
    console.log(JSON.stringify(normalizeList(response, void 0, () => runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }
  if (action === "get") {
    const resultId = parsePositiveId(id, "Test result ID");
    const result = await request("GET", `test/Runs/${runId}/results/${resultId}${buildQuery({ detailsToInclude: options.details })}`, {
      project: options.project
    });
    console.log(JSON.stringify(normalizeResource(result, runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }
  if (action === "add") {
    const body = parseResultInputs(options.results, false).map(toAzureResult);
    const response = await request("POST", `test/Runs/${runId}/results`, {
      project: options.project,
      body
    });
    console.log(JSON.stringify(normalizeList(response, void 0, () => runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }
  if (action === "update") {
    let body;
    if (options.results) {
      body = parseResultInputs(options.results, true).map(toAzureResult);
    } else {
      const resultId = parsePositiveId(id, "Test result ID");
      const scalarInput = {
        id: resultId,
        ...options.outcome ? { outcome: options.outcome } : {},
        ...options.state ? { state: options.state } : {},
        ...options.durationMs !== void 0 ? { durationMs: Number(options.durationMs) } : {},
        ...options.comment !== void 0 ? { comment: options.comment } : {},
        ...options.errorMessage !== void 0 ? { errorMessage: options.errorMessage } : {},
        ...options.startedDate ? { startedDate: options.startedDate } : {},
        ...options.completedDate ? { completedDate: options.completedDate } : {}
      };
      if (Object.keys(scalarInput).length === 1) throw new Error("At least one test result field to update is required");
      body = parseResultInputs(JSON.stringify([scalarInput]), true).map(toAzureResult);
    }
    const response = await request("PATCH", `test/Runs/${runId}/results`, {
      project: options.project,
      body
    });
    console.log(JSON.stringify(normalizeList(response, void 0, () => runWebUrl(options.project, { id: runId })), null, 2));
    return;
  }
  throw new Error(`Unknown action: test-result ${action || "(none)"}`);
}

// src/cli.ts
function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        options[key] = next;
        i++;
      } else {
        options[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}
function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function getOpt(options, ...keys) {
  for (const key of keys) {
    if (options[key]) return options[key];
    const camel = camelCase(key);
    if (options[camel]) return options[camel];
  }
  return void 0;
}
var HELP = `azure-devops-cli \u2014 Interact with Azure DevOps Boards and Test Plans

Usage:
  azure-devops-cli <resource> <action> [options]

Resources & Actions:

  project list      [--top N] [--skip N]

  work-item search  --project "Name" --query "text or WIQL" [--type Bug] [--state Active] [--area-path "Project\\\\Area"] [--top 50]
  work-item get     <id> --project "Name" [--fields "System.Title,System.State"] [--expand All]
  work-item create  --project "Name" --type Bug --title "..." [--description "..."] [--area-path "..."] [--iteration-path "..."] [--priority N] [--severity "1 - Critical"] [--assigned-to "user@..."] [--tags "tag1; tag2"] [--parent-id 123]
  work-item update  <id> --project "Name" [--state "Resolved"] [--assignee "user@..."] [--priority N] [--title "..."] [--tags "..."] [--severity "..."] [--operations '[JSON Patch]']
  work-item comment <id> --project "Name" --body "Comment text (HTML supported)"

  test-plan list --project "Name" [--owner ID] [--active-only true] [--continuation-token TOKEN]
  test-plan get <id> --project "Name"
  test-plan create --project "Name" --name "..." [--area-path "..."] [--iteration "..."]
  test-plan update <id> --project "Name" [--name "..."] [--state Active]

  test-suite list --project "Name" --plan-id ID [--tree true] [--continuation-token TOKEN]
  test-suite get <id> --project "Name" --plan-id ID
  test-suite create --project "Name" --plan-id ID --parent-suite-id ID --name "..." [--suite-type staticTestSuite]
  test-suite update <id> --project "Name" --plan-id ID [--name "..."] [--parent-suite-id ID]
  test-suite add-cases <id> --project "Name" --plan-id ID --case-ids "1,2" [--configuration-ids "1,2"]
  test-suite remove-cases <id> --project "Name" --plan-id ID --case-ids "1,2"

  test-case list --project "Name" --plan-id ID --suite-id ID [--continuation-token TOKEN]
  test-case get <id> --project "Name"
  test-case create --project "Name" --title "..." --steps '[{"action":"...","expected":"..."}]'
  test-case update <id> --project "Name" [--title "..."] [--steps '[...]']

  test-point list --project "Name" --plan-id ID --suite-id ID [--case-id ID] [--continuation-token TOKEN]

  test-run list --project "Name" [--plan-id ID] [--top N] [--skip N]
  test-run get <id> --project "Name"
  test-run create --project "Name" --plan-id ID --point-ids "1,2" --name "..."
  test-run complete <id> --project "Name" [--comment "..."]

  test-result list --project "Name" --run-id ID [--top N] [--outcomes Passed,Failed]
  test-result get <id> --project "Name" --run-id ID
  test-result add --project "Name" --run-id ID --results '[{"testPointId":1,"outcome":"Passed"}]'
  test-result update <id> --project "Name" --run-id ID [--outcome Passed] [--comment "..."]
  test-result update --project "Name" --run-id ID --results '[{"id":100001,"outcome":"Failed"}]'

Environment Variables:
  AZURE_DEVOPS_ORG_URL    Azure DevOps organization URL (required)
  AZURE_DEVOPS_PAT        Personal Access Token (required)

Options:
  --help, -h        Show this help message`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }
  if (args[0] === "--version") {
    console.log("0.2.0");
    process.exit(0);
  }
  const { positional, options } = parseArgs(args);
  const resource = positional[0];
  const action = positional[1];
  if (action === "--help" || action === "-h" || getOpt(options, "help") === "true") {
    console.log(HELP);
    process.exit(0);
  }
  try {
    switch (resource) {
      case "project":
        if (action === "list") {
          await listProjectsCommand({
            top: getOpt(options, "top"),
            skip: getOpt(options, "skip")
          });
        } else {
          console.error(`Unknown action: project ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "work-item":
        switch (action) {
          case "search":
            await searchCommand({
              project: getOpt(options, "project") || "",
              query: getOpt(options, "query"),
              type: getOpt(options, "type"),
              state: getOpt(options, "state"),
              areaPath: getOpt(options, "area-path"),
              top: getOpt(options, "top")
            });
            break;
          case "get":
            await getCommand(positional[2], {
              project: getOpt(options, "project") || "",
              fields: getOpt(options, "fields"),
              expand: getOpt(options, "expand")
            });
            break;
          case "create":
            await createCommand({
              project: getOpt(options, "project") || "",
              type: getOpt(options, "type") || "",
              title: getOpt(options, "title") || "",
              description: getOpt(options, "description"),
              areaPath: getOpt(options, "area-path"),
              iterationPath: getOpt(options, "iteration-path"),
              assignedTo: getOpt(options, "assigned-to"),
              priority: getOpt(options, "priority"),
              severity: getOpt(options, "severity"),
              tags: getOpt(options, "tags"),
              parentId: getOpt(options, "parent-id")
            });
            break;
          case "update":
            await updateCommand(positional[2], {
              project: getOpt(options, "project") || "",
              state: getOpt(options, "state"),
              assignee: getOpt(options, "assignee"),
              priority: getOpt(options, "priority"),
              title: getOpt(options, "title"),
              tags: getOpt(options, "tags"),
              severity: getOpt(options, "severity"),
              operations: getOpt(options, "operations")
            });
            break;
          case "comment":
            await commentCommand(positional[2], {
              project: getOpt(options, "project") || "",
              body: getOpt(options, "body") || ""
            });
            break;
          default:
            console.error(`Unknown action: work-item ${action || "(none)"}. Use --help for usage.`);
            process.exit(1);
        }
        break;
      case "test-plan":
        await testPlanCommand(action, positional[2], {
          project: getOpt(options, "project") || "",
          name: getOpt(options, "name"),
          areaPath: getOpt(options, "area-path"),
          iteration: getOpt(options, "iteration"),
          description: getOpt(options, "description"),
          state: getOpt(options, "state"),
          startDate: getOpt(options, "start-date"),
          endDate: getOpt(options, "end-date"),
          owner: getOpt(options, "owner"),
          continuationToken: getOpt(options, "continuation-token"),
          includeDetails: getOpt(options, "include-details"),
          activeOnly: getOpt(options, "active-only")
        });
        break;
      case "test-suite":
        await testSuiteCommand(action, positional[2], {
          project: getOpt(options, "project") || "",
          planId: getOpt(options, "plan-id"),
          name: getOpt(options, "name"),
          parentSuiteId: getOpt(options, "parent-suite-id"),
          suiteType: getOpt(options, "suite-type"),
          query: getOpt(options, "query"),
          requirementId: getOpt(options, "requirement-id"),
          configurationIds: getOpt(options, "configuration-ids"),
          inheritConfigurations: getOpt(options, "inherit-configurations"),
          continuationToken: getOpt(options, "continuation-token"),
          expand: getOpt(options, "expand"),
          tree: getOpt(options, "tree"),
          revision: getOpt(options, "revision"),
          caseIds: getOpt(options, "case-ids")
        });
        break;
      case "test-case":
        await testCaseCommand(action, positional[2], {
          project: getOpt(options, "project") || "",
          planId: getOpt(options, "plan-id"),
          suiteId: getOpt(options, "suite-id"),
          title: getOpt(options, "title"),
          steps: getOpt(options, "steps"),
          priority: getOpt(options, "priority"),
          areaPath: getOpt(options, "area-path"),
          iterationPath: getOpt(options, "iteration-path"),
          tags: getOpt(options, "tags"),
          state: getOpt(options, "state"),
          continuationToken: getOpt(options, "continuation-token"),
          configurationIds: getOpt(options, "configuration-ids")
        });
        break;
      case "test-point":
        await testPointCommand(action, {
          project: getOpt(options, "project") || "",
          planId: getOpt(options, "plan-id"),
          suiteId: getOpt(options, "suite-id"),
          caseId: getOpt(options, "case-id"),
          pointIds: getOpt(options, "point-ids"),
          continuationToken: getOpt(options, "continuation-token"),
          includeDetails: getOpt(options, "include-details"),
          recursive: getOpt(options, "recursive")
        });
        break;
      case "test-run":
        await testRunCommand(action, positional[2], {
          project: getOpt(options, "project") || "",
          planId: getOpt(options, "plan-id"),
          pointIds: getOpt(options, "point-ids"),
          name: getOpt(options, "name"),
          comment: getOpt(options, "comment"),
          automated: getOpt(options, "automated"),
          top: getOpt(options, "top"),
          skip: getOpt(options, "skip"),
          minLastUpdated: getOpt(options, "min-last-updated"),
          maxLastUpdated: getOpt(options, "max-last-updated"),
          completedDate: getOpt(options, "completed-date")
        });
        break;
      case "test-result":
        await testResultCommand(action, positional[2], {
          project: getOpt(options, "project") || "",
          runId: getOpt(options, "run-id"),
          results: getOpt(options, "results"),
          top: getOpt(options, "top"),
          skip: getOpt(options, "skip"),
          outcomes: getOpt(options, "outcomes"),
          details: getOpt(options, "details"),
          outcome: getOpt(options, "outcome"),
          state: getOpt(options, "state"),
          durationMs: getOpt(options, "duration-ms"),
          comment: getOpt(options, "comment"),
          errorMessage: getOpt(options, "error-message"),
          startedDate: getOpt(options, "started-date"),
          completedDate: getOpt(options, "completed-date")
        });
        break;
      default:
        console.error(`Unknown resource: ${resource}. Use --help for usage.`);
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exitCode = 1;
  }
}
main();
