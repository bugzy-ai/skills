#!/usr/bin/env node
"use strict";

// src/clickup-client.ts
var CLICKUP_API_URL = "https://api.clickup.com/api/v2";
function getApiToken() {
  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    throw new Error(
      "CLICKUP_API_TOKEN environment variable is required. Set it to your ClickUp API token or OAuth access token."
    );
  }
  return token;
}
function getTeamId() {
  const teamId = process.env.CLICKUP_TEAM_ID;
  if (!teamId) {
    throw new Error(
      "CLICKUP_TEAM_ID environment variable is required. Set it to your ClickUp workspace (team) ID."
    );
  }
  return teamId;
}
async function request(method, path, body) {
  const token = getApiToken();
  const url = `${CLICKUP_API_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (response.status === 429) {
    const resetHeader = response.headers.get("X-RateLimit-Reset");
    if (resetHeader) {
      const resetTime = parseInt(resetHeader, 10) * 1e3;
      const waitMs = Math.max(0, resetTime - Date.now()) + 100;
      const maxWait = 6e4;
      if (waitMs <= maxWait) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        const retryResponse = await fetch(url, options);
        if (!retryResponse.ok) {
          const text = await retryResponse.text();
          throw new Error(`ClickUp API error ${retryResponse.status}: ${text}`);
        }
        return await retryResponse.json();
      }
    }
    throw new Error(
      "ClickUp API rate limit exceeded (429). Please wait before retrying."
    );
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ClickUp API error ${response.status}: ${text}`);
  }
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {};
  }
  return await response.json();
}

// src/commands/task.ts
async function searchTasks(options) {
  const teamId = getTeamId();
  const params = new URLSearchParams();
  if (options.query) {
  }
  params.set("include_closed", "true");
  params.set("subtasks", "true");
  if (options.list) {
    params.set("list_ids[]", options.list);
  }
  if (options.space) {
    params.set("space_ids[]", options.space);
  }
  if (options.status) {
    params.set("statuses[]", options.status);
  }
  if (options.assignee) {
    params.set("assignees[]", options.assignee);
  }
  const page = options.page ? parseInt(options.page, 10) : 0;
  params.set("page", String(page));
  const data = await request(
    "GET",
    `/team/${teamId}/task?${params.toString()}`
  );
  let tasks = data.tasks;
  if (options.query) {
    const q = options.query.toLowerCase();
    tasks = tasks.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description && t.description.toLowerCase().includes(q)
    );
  }
  const limit = options.limit ? parseInt(options.limit, 10) : 100;
  if (tasks.length > limit) {
    tasks = tasks.slice(0, limit);
  }
  console.log(JSON.stringify(tasks));
}
async function getTask(taskId) {
  if (!taskId) {
    throw new Error("Task ID is required (e.g., abc123 or custom ID)");
  }
  try {
    const task = await request("GET", `/task/${taskId}`);
    console.log(JSON.stringify(task));
    return;
  } catch {
    const teamId = getTeamId();
    const task = await request(
      "GET",
      `/task/${taskId}?custom_task_ids=true&team_id=${teamId}`
    );
    console.log(JSON.stringify(task));
  }
}
async function createTask(options) {
  if (!options.list) {
    throw new Error("--list is required for task create (list ID)");
  }
  if (!options.name) {
    throw new Error("--name is required for task create");
  }
  const body = {
    name: options.name
  };
  if (options.description) {
    body.description = options.description;
  }
  if (options.status) {
    body.status = options.status;
  }
  if (options.priority) {
    body.priority = parseInt(options.priority, 10);
  }
  if (options.assignee) {
    body.assignees = [parseInt(options.assignee, 10)];
  }
  const task = await request(
    "POST",
    `/list/${options.list}/task`,
    body
  );
  console.log(JSON.stringify(task));
}
async function updateTask(taskId, options) {
  if (!taskId) {
    throw new Error("Task ID is required for task update");
  }
  const body = {};
  if (options.name) {
    body.name = options.name;
  }
  if (options.description) {
    body.description = options.description;
  }
  if (options.status) {
    body.status = options.status;
  }
  if (options.priority) {
    body.priority = parseInt(options.priority, 10);
  }
  if (options.assignee) {
    body.assignees = { add: [parseInt(options.assignee, 10)] };
  }
  if (Object.keys(body).length === 0) {
    throw new Error("No update options provided");
  }
  const task = await request("PUT", `/task/${taskId}`, body);
  console.log(JSON.stringify(task));
}
async function commentTask(taskId, body) {
  if (!taskId) {
    throw new Error("Task ID is required for task comment");
  }
  if (!body) {
    throw new Error("--body is required for task comment");
  }
  const comment = await request(
    "POST",
    `/task/${taskId}/comment`,
    { comment_text: body }
  );
  console.log(JSON.stringify(comment));
}

// src/commands/space.ts
async function listSpaces() {
  const teamId = getTeamId();
  const data = await request(
    "GET",
    `/team/${teamId}/space`
  );
  console.log(JSON.stringify(data.spaces));
}

// src/commands/list.ts
async function listLists(spaceId) {
  if (!spaceId) {
    throw new Error("--space is required for list list");
  }
  const folderlessData = await request(
    "GET",
    `/space/${spaceId}/list`
  );
  const folderData = await request(
    "GET",
    `/space/${spaceId}/folder`
  );
  const allLists = [];
  for (const list of folderlessData.lists) {
    allLists.push(list);
  }
  for (const folder of folderData.folders) {
    for (const list of folder.lists) {
      allLists.push({ ...list, folder_name: folder.name });
    }
  }
  console.log(JSON.stringify(allLists));
}

// src/commands/status.ts
async function listStatuses(listId) {
  if (!listId) {
    throw new Error("--list is required for status list");
  }
  const list = await request("GET", `/list/${listId}`);
  console.log(JSON.stringify(list.statuses || []));
}

// src/commands/workspace.ts
async function listWorkspaces() {
  const data = await request("GET", "/team");
  console.log(JSON.stringify(data.teams));
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
var HELP = `clickup-cli \u2014 Interact with ClickUp's REST API v2

Usage:
  clickup-cli <resource> <action> [options]

Resources & Actions:

  task search     [--query "text"] [--space SPACE_ID] [--list LIST_ID] [--status "name"] [--assignee USER_ID] [--limit N] [--page N]
  task get        <task_id>
  task create     --list LIST_ID --name "..." [--description "..."] [--priority N] [--status "name"] [--assignee USER_ID]
  task update     <task_id> [--name "..."] [--status "name"] [--priority N] [--description "..."] [--assignee USER_ID]
  task comment    <task_id> --body "..."

  space list
  list list       --space SPACE_ID
  status list     --list LIST_ID
  workspace list

Environment Variables:
  CLICKUP_API_TOKEN   ClickUp API token or OAuth access token (required)
  CLICKUP_TEAM_ID     ClickUp workspace (team) ID (required for search)

Options:
  --help, -h        Show this help message

Notes:
  Priority values: 1=Urgent, 2=High, 3=Normal, 4=Low
  Statuses are per-list \u2014 use "status list --list LIST_ID" to discover available statuses`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
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
      case "task":
        switch (action) {
          case "search":
            await searchTasks({
              query: getOpt(options, "query"),
              list: getOpt(options, "list"),
              space: getOpt(options, "space"),
              status: getOpt(options, "status"),
              assignee: getOpt(options, "assignee"),
              limit: getOpt(options, "limit"),
              page: getOpt(options, "page")
            });
            break;
          case "get":
            await getTask(positional[2]);
            break;
          case "create":
            await createTask({
              list: getOpt(options, "list") || "",
              name: getOpt(options, "name") || "",
              description: getOpt(options, "description"),
              status: getOpt(options, "status"),
              priority: getOpt(options, "priority"),
              assignee: getOpt(options, "assignee")
            });
            break;
          case "update":
            await updateTask(positional[2], {
              name: getOpt(options, "name"),
              description: getOpt(options, "description"),
              status: getOpt(options, "status"),
              priority: getOpt(options, "priority"),
              assignee: getOpt(options, "assignee")
            });
            break;
          case "comment":
            await commentTask(positional[2], getOpt(options, "body") || "");
            break;
          default:
            console.error(`Unknown action: task ${action || "(none)"}. Use --help for usage.`);
            process.exit(1);
        }
        break;
      case "space":
        if (action === "list") {
          await listSpaces();
        } else {
          console.error(`Unknown action: space ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "list":
        if (action === "list") {
          await listLists(getOpt(options, "space") || "");
        } else {
          console.error(`Unknown action: list ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "status":
        if (action === "list") {
          await listStatuses(getOpt(options, "list") || "");
        } else {
          console.error(`Unknown action: status ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "workspace":
        if (action === "list") {
          await listWorkspaces();
        } else {
          console.error(`Unknown action: workspace ${action || "(none)"}. Use --help for usage.`);
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
