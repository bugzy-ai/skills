#!/usr/bin/env node
"use strict";

// src/jira-client.ts
var MAX_RETRIES = 3;
var BASE_DELAY_MS = 1e3;
function getToken() {
  const token = process.env.JIRA_CLOUD_TOKEN;
  if (!token) {
    throw new Error(
      "JIRA_CLOUD_TOKEN environment variable is required. Set it to your Jira Cloud OAuth access token."
    );
  }
  return token;
}
function getCloudId() {
  const cloudId = process.env.JIRA_CLOUD_ID;
  if (!cloudId) {
    throw new Error(
      "JIRA_CLOUD_ID environment variable is required. Set it to your Atlassian Cloud site ID."
    );
  }
  return cloudId;
}
function getBaseUrl(cloudId) {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
}
function getBackoffDelay(attempt, retryAfterHeader) {
  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    if (!isNaN(seconds)) return seconds * 1e3;
  }
  const baseDelay = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay * 0.5;
  return baseDelay + jitter;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function parseErrorBody(response) {
  try {
    const body = await response.json();
    const messages = [];
    if (body.errorMessages && body.errorMessages.length > 0) {
      messages.push(...body.errorMessages);
    }
    if (body.errors && Object.keys(body.errors).length > 0) {
      for (const [field, msg] of Object.entries(body.errors)) {
        messages.push(`${field}: ${msg}`);
      }
    }
    if (body.message) {
      messages.push(body.message);
    }
    if (messages.length > 0) return messages.join("; ");
  } catch {
  }
  return `HTTP ${response.status}`;
}
async function request(method, path, body) {
  const token = getToken();
  const cloudId = getCloudId();
  const baseUrl = getBaseUrl(cloudId);
  const url = `${baseUrl}${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json"
  };
  if (body !== void 0) {
    headers["Content-Type"] = "application/json";
  }
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    if (response.ok) {
      if (response.status === 204) return {};
      return await response.json();
    }
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const backoff = getBackoffDelay(attempt, response.headers.get("Retry-After"));
      await delay(backoff);
      continue;
    }
    const errorMessage = await parseErrorBody(response);
    throw new Error(`Jira API error ${response.status}: ${errorMessage}`);
  }
  throw new Error("Jira API: max retries exceeded");
}
function textToAdf(text) {
  const lines = text.split("\n");
  const content = lines.map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line }] : []
  }));
  return {
    version: 1,
    type: "doc",
    content
  };
}

// src/commands/issue.ts
var DEFAULT_LIMIT = 50;
var DEFAULT_FIELDS = "key,summary,status,assignee,issuetype,priority,project,created,updated";
async function searchIssues(options) {
  if (!options.jql) {
    throw new Error("--jql is required for issue search");
  }
  const limit = options.limit ? parseInt(options.limit, 10) : DEFAULT_LIMIT;
  const startAt = options.startAt ? parseInt(options.startAt, 10) : 0;
  const fields = options.fields || DEFAULT_FIELDS;
  const params = new URLSearchParams({
    jql: options.jql,
    fields,
    maxResults: String(Math.min(limit, 100)),
    startAt: String(startAt)
  });
  const result = await request(
    "GET",
    `/search/jql?${params.toString()}`
  );
  console.log(JSON.stringify({ issues: result.issues, total: result.total }));
}
async function getIssue(key, options = {}) {
  if (!key) {
    throw new Error("Issue key is required (e.g., PROJ-123)");
  }
  const params = new URLSearchParams();
  if (options.fields) params.set("fields", options.fields);
  if (options.expand) params.set("expand", options.expand);
  const qs = params.toString();
  const path = `/issue/${encodeURIComponent(key)}${qs ? `?${qs}` : ""}`;
  const result = await request("GET", path);
  console.log(JSON.stringify(result));
}
async function createIssue(options) {
  if (!options.project) {
    throw new Error("--project is required for issue create");
  }
  if (!options.type) {
    throw new Error("--type is required for issue create");
  }
  if (!options.summary) {
    throw new Error("--summary is required for issue create");
  }
  const fields = {
    project: { key: options.project },
    issuetype: { name: options.type },
    summary: options.summary
  };
  if (options.description) {
    fields.description = textToAdf(options.description);
  }
  if (options.priority) {
    fields.priority = { name: options.priority };
  }
  if (options.assignee) {
    fields.assignee = { accountId: options.assignee };
  }
  if (options.labels && options.labels.length > 0) {
    fields.labels = options.labels;
  }
  if (options.components && options.components.length > 0) {
    fields.components = options.components.map((name) => ({ name }));
  }
  const result = await request("POST", "/issue", { fields });
  console.log(JSON.stringify(result));
}
async function updateIssue(key, options) {
  if (!key) {
    throw new Error("Issue key is required (e.g., PROJ-123)");
  }
  const fields = {};
  if (options.summary) {
    fields.summary = options.summary;
  }
  if (options.assignee) {
    fields.assignee = { accountId: options.assignee };
  }
  if (Object.keys(fields).length === 0) {
    throw new Error("No update options provided. Use --summary or --assignee.");
  }
  await request("PUT", `/issue/${encodeURIComponent(key)}`, { fields });
  console.log(JSON.stringify({ key, updated: true }));
}
async function commentIssue(key, body, options = {}) {
  if (!key) {
    throw new Error("Issue key is required (e.g., PROJ-123)");
  }
  if (!body) {
    throw new Error("--body is required for issue comment");
  }
  const payload = {
    body: textToAdf(body)
  };
  if (options.visibilityType && options.visibilityValue) {
    payload.visibility = {
      type: options.visibilityType,
      value: options.visibilityValue
    };
  }
  const result = await request(
    "POST",
    `/issue/${encodeURIComponent(key)}/comment`,
    payload
  );
  console.log(JSON.stringify(result));
}
async function transitionIssue(key, toName) {
  if (!key) {
    throw new Error("Issue key is required (e.g., PROJ-123)");
  }
  if (!toName) {
    throw new Error("--to is required for issue transition");
  }
  const transitionsResult = await request("GET", `/issue/${encodeURIComponent(key)}/transitions`);
  const transition = transitionsResult.transitions.find(
    (t) => t.name.toLowerCase() === toName.toLowerCase() || t.id === toName
  );
  if (!transition) {
    const available = transitionsResult.transitions.map((t) => `"${t.name}" (id: ${t.id})`).join(", ");
    throw new Error(
      `Transition "${toName}" not found for ${key}. Available transitions: ${available}`
    );
  }
  await request("POST", `/issue/${encodeURIComponent(key)}/transitions`, {
    transition: { id: transition.id }
  });
  console.log(JSON.stringify({ key, transitioned: true, to: transition.name }));
}

// src/commands/project.ts
async function listProjects() {
  const result = await request("GET", "/project/search");
  console.log(JSON.stringify(result.values));
}
async function getProject(projectIdOrKey) {
  if (!projectIdOrKey) throw new Error("--project is required");
  return request("GET", `/project/${encodeURIComponent(projectIdOrKey)}`);
}

// src/commands/field.ts
async function listFields() {
  const result = await request("GET", "/field");
  console.log(JSON.stringify(result));
}

// src/commands/version.ts
async function listVersions(args) {
  if (!args.project) throw new Error("--project is required");
  const versions = await request(
    "GET",
    `/project/${encodeURIComponent(args.project)}/versions`
  );
  process.stdout.write(JSON.stringify(versions, null, 2));
}
async function ensureVersion(args) {
  if (!args.project) throw new Error("--project is required");
  if (!args.name) throw new Error("--name is required");
  const versions = await request(
    "GET",
    `/project/${encodeURIComponent(args.project)}/versions`
  );
  const matchingVersions = versions.filter((version2) => version2.name === args.name);
  const existing = matchingVersions.find((version2) => !version2.archived && !version2.released);
  if (existing) {
    process.stdout.write(JSON.stringify({ created: false, version: existing }, null, 2));
    return;
  }
  if (matchingVersions.length > 0) {
    throw new Error(
      `Jira version "${args.name}" exists but is archived or released. Choose an unreleased, unarchived version or update the existing version before retrying.`
    );
  }
  const project = await getProject(args.project);
  const version = await request("POST", "/version", {
    name: args.name,
    projectId: Number(project.id),
    released: false,
    archived: false,
    ...args.description ? { description: args.description } : {}
  });
  process.stdout.write(JSON.stringify({ created: true, version }, null, 2));
}

// src/cli.ts
function parseArgs(args) {
  const positional = [];
  const options = {};
  const arrays = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        if (key === "label" || key === "component") {
          if (!arrays[key]) arrays[key] = [];
          arrays[key].push(next);
        }
        options[key] = next;
        i++;
      } else {
        options[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, options, arrays };
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
var HELP = `jira-cli \u2014 Interact with Jira Cloud REST API v3

Usage:
  jira-cli <resource> <action> [options]

Resources & Actions:

  issue search    --jql "..." [--fields "summary,status"] [--limit N] [--start-at N]
  issue get       <KEY>       [--fields "..."] [--expand "transitions,changelog"]
  issue create    --project KEY --type Bug --summary "..." [--description "..."] [--priority "High"] [--assignee "accountId"] [--label "bug"] [--component "Auth"]
  issue update    <KEY>       [--summary "..."] [--assignee "accountId"]
  issue comment   <KEY>       --body "..." [--visibility-type role --visibility-value "Developers"]
  issue transition <KEY>      --to "Done"

  project list
  version list    --project KEY
  version ensure  --project KEY --name "1.2.3" [--description "..."]
  field list

Environment Variables:
  JIRA_CLOUD_TOKEN    Jira Cloud OAuth access token (required)
  JIRA_CLOUD_ID       Atlassian Cloud site ID (required)

Options:
  --help, -h        Show this help message`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }
  const { positional, options, arrays } = parseArgs(args);
  const resource = positional[0];
  const action = positional[1];
  if (action === "--help" || action === "-h" || getOpt(options, "help") === "true") {
    console.log(HELP);
    process.exit(0);
  }
  try {
    switch (resource) {
      case "issue":
        switch (action) {
          case "search":
            await searchIssues({
              jql: getOpt(options, "jql") || "",
              fields: getOpt(options, "fields"),
              limit: getOpt(options, "limit"),
              startAt: getOpt(options, "start-at")
            });
            break;
          case "get":
            await getIssue(positional[2], {
              fields: getOpt(options, "fields"),
              expand: getOpt(options, "expand")
            });
            break;
          case "create": {
            let labels = arrays["label"] || [];
            const labelsOpt = getOpt(options, "labels");
            if (labelsOpt) {
              labels = [...labels, ...labelsOpt.split(",").map((l) => l.trim())];
            }
            let components = arrays["component"] || [];
            const componentsOpt = getOpt(options, "components");
            if (componentsOpt) {
              components = [...components, ...componentsOpt.split(",").map((c) => c.trim())];
            }
            await createIssue({
              project: getOpt(options, "project") || "",
              type: getOpt(options, "type") || "",
              summary: getOpt(options, "summary") || "",
              description: getOpt(options, "description"),
              priority: getOpt(options, "priority"),
              assignee: getOpt(options, "assignee"),
              labels: labels.length > 0 ? labels : void 0,
              components: components.length > 0 ? components : void 0
            });
            break;
          }
          case "update":
            await updateIssue(positional[2], {
              summary: getOpt(options, "summary"),
              assignee: getOpt(options, "assignee")
            });
            break;
          case "comment":
            await commentIssue(positional[2], getOpt(options, "body") || "", {
              visibilityType: getOpt(options, "visibility-type"),
              visibilityValue: getOpt(options, "visibility-value")
            });
            break;
          case "transition":
            await transitionIssue(positional[2], getOpt(options, "to") || "");
            break;
          default:
            console.error(`Unknown action: issue ${action || "(none)"}. Use --help for usage.`);
            process.exit(1);
        }
        break;
      case "project":
        if (action === "list") {
          await listProjects();
        } else {
          console.error(`Unknown action: project ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "version":
        switch (action) {
          case "list":
            await listVersions({
              project: getOpt(options, "project") || ""
            });
            break;
          case "ensure":
            await ensureVersion({
              project: getOpt(options, "project") || "",
              name: getOpt(options, "name"),
              description: getOpt(options, "description")
            });
            break;
          default:
            console.error(`Unknown action: version ${action || "(none)"}. Use --help for usage.`);
            process.exit(1);
        }
        break;
      case "field":
        if (action === "list") {
          await listFields();
        } else {
          console.error(`Unknown action: field ${action || "(none)"}. Use --help for usage.`);
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
