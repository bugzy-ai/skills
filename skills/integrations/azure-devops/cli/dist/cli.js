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
  return { orgUrl: orgUrl.replace(/\/$/, ""), pat };
}
function getBackoffDelay(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) return seconds * 1e3;
  }
  return Math.min(1e3 * Math.pow(2, attempt), 3e4);
}
async function request(method, endpoint, options) {
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
        body: options?.body ? JSON.stringify(options.body) : void 0,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        if (response.status === 204) return {};
        return await response.json();
      }
      const isRetryable = response.status === 429 || response.status >= 500;
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = getBackoffDelay(attempt, response.headers.get("Retry-After"));
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
        errorMessage = "Authentication failed (401). Your Personal Access Token may be expired or have insufficient permissions.";
      }
      throw new AzureDevOpsError(errorMessage, response.status, isRetryable);
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
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        true
      );
    }
  }
  throw new AzureDevOpsError("Max retries exceeded", 0, true);
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
    config: options?.config
  });
}
async function createWorkItem(type, operations, project, options) {
  return request("POST", `wit/workitems/$${encodeURIComponent(type)}`, {
    body: operations,
    contentType: "application/json-patch+json",
    project,
    config: options?.config
  });
}
async function updateWorkItem(id, operations, project, options) {
  return request("PATCH", `wit/workitems/${id}`, {
    body: operations,
    contentType: "application/json-patch+json",
    project,
    config: options?.config
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
var HELP = `azure-devops-cli \u2014 Interact with Azure DevOps Work Item Tracking API

Usage:
  azure-devops-cli <resource> <action> [options]

Resources & Actions:

  project list      [--top N] [--skip N]

  work-item search  --project "Name" --query "text or WIQL" [--type Bug] [--state Active] [--area-path "Project\\\\Area"] [--top 50]
  work-item get     <id> --project "Name" [--fields "System.Title,System.State"] [--expand All]
  work-item create  --project "Name" --type Bug --title "..." [--description "..."] [--area-path "..."] [--iteration-path "..."] [--priority N] [--severity "1 - Critical"] [--assigned-to "user@..."] [--tags "tag1; tag2"] [--parent-id 123]
  work-item update  <id> --project "Name" [--state "Resolved"] [--assignee "user@..."] [--priority N] [--title "..."] [--tags "..."] [--severity "..."] [--operations '[JSON Patch]']
  work-item comment <id> --project "Name" --body "Comment text (HTML supported)"

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
    console.log("0.1.0");
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
      default:
        console.error(`Unknown resource: ${resource}. Use --help for usage.`);
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exit(1);
  }
}
main();
