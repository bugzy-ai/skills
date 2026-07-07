#!/usr/bin/env node
"use strict";

// src/client.ts
var BASE_URL = "https://api.zephyrscale.smartbear.com/v2";
var MAX_RETRIES = 3;
var MAX_BACKOFF_MS = 1e4;
var FETCH_TIMEOUT_MS = 3e4;
function getToken() {
  const token = process.env.ZEPHYR_API_TOKEN;
  if (!token) {
    throw new Error(
      "ZEPHYR_API_TOKEN environment variable is required. Generate one at: Jira Settings \u2192 General Settings \u2192 Apps \u2192 Zephyr API Access Tokens."
    );
  }
  return token;
}
async function request(method, path, body, params, attempt = 0) {
  const token = getToken();
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== void 0 && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      ...body ? { body: JSON.stringify(body) } : {},
      signal: controller.signal
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timeout after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  if (response.status === 204) {
    return {};
  }
  const isRetryable = response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504;
  if (isRetryable && attempt < MAX_RETRIES) {
    const retryAfter = response.headers.get("Retry-After");
    const retryMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1e3, MAX_BACKOFF_MS) : Math.min(1e3 * 2 ** attempt, MAX_BACKOFF_MS);
    await new Promise((resolve) => setTimeout(resolve, retryMs));
    return request(method, path, body, params, attempt + 1);
  }
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Zephyr API error ${response.status}: ${text2}`);
  }
  const text = await response.text();
  if (!text) return {};
  return JSON.parse(text);
}

// src/commands/create-case.ts
async function createCase(args) {
  if (!args.project) throw new Error("--project is required");
  if (!args.name) throw new Error("--name is required");
  if (!args.folder) throw new Error("--folder is required (cases without a folder are invisible in the Zephyr UI)");
  const folderId = parseInt(args.folder, 10);
  if (isNaN(folderId)) throw new Error(`--folder must be a numeric ID, got: "${args.folder}"`);
  const body = {
    projectKey: args.project,
    name: args.name,
    folderId
  };
  if (args.objective) body.objective = args.objective;
  if (args.precondition) body.precondition = args.precondition;
  if (args.labels) body.labels = args.labels.split(",").map((l) => l.trim());
  if (args.priority) body.priorityName = args.priority;
  if (args.status) body.statusName = args.status;
  const result = await request("POST", "/testcases", body);
  if (args.steps) {
    const steps = JSON.parse(args.steps);
    await request("POST", `/testcases/${result.key}/teststeps`, {
      mode: "OVERWRITE",
      items: steps.map((s) => ({
        inline: {
          description: s.description,
          testData: s.testData || "",
          expectedResult: s.expectedResult || ""
        }
      }))
    });
  }
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/get-case.ts
async function getCase(args) {
  if (!args.key) throw new Error("--key is required");
  const result = await request("GET", `/testcases/${args.key}`);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/get-steps.ts
async function getSteps(args) {
  if (!args.key) throw new Error("--key is required");
  const allSteps = [];
  let startAt = 0;
  const maxResults = 100;
  while (true) {
    const result = await request(
      "GET",
      `/testcases/${args.key}/teststeps`,
      void 0,
      { startAt, maxResults }
    );
    allSteps.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }
  process.stdout.write(JSON.stringify(allSteps, null, 2));
}

// src/commands/update-case.ts
async function resolvePriorityRef(name) {
  const result = await request(
    "GET",
    "/priorities"
  );
  const match = result.values.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) throw new Error(`Unknown priority: "${name}"`);
  return { id: match.id };
}
async function resolveStatusRef(name, projectId) {
  const result = await request(
    "GET",
    "/statuses",
    void 0,
    { statusType: "TEST_CASE", projectId }
  );
  const match = result.values.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) throw new Error(`Unknown status: "${name}"`);
  return { id: match.id };
}
async function updateCase(args) {
  if (!args.key) throw new Error("--key is required");
  const existing = await request("GET", `/testcases/${args.key}`);
  const body = {
    id: existing.id,
    key: existing.key,
    project: { id: existing.project.id },
    name: args.name ?? existing.name,
    objective: args.objective ?? existing.objective,
    precondition: args.precondition ?? existing.precondition,
    priority: existing.priority,
    status: existing.status,
    folder: existing.folder
  };
  if (args.folder) {
    const folderId = parseInt(args.folder, 10);
    if (isNaN(folderId)) throw new Error(`--folder must be a numeric ID, got: "${args.folder}"`);
    body.folder = { id: folderId };
  }
  if (args.priority) {
    body.priority = await resolvePriorityRef(args.priority);
  }
  if (args.status) {
    body.status = await resolveStatusRef(args.status, existing.project.id);
  }
  if (args.labels) body.labels = args.labels.split(",").map((l) => l.trim());
  const result = await request("PUT", `/testcases/${args.key}`, body);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/list-cases.ts
async function listCases(args) {
  if (!args.project) throw new Error("--project is required");
  if (args.maxResults || args.startAt) {
    const params = {
      projectKey: args.project,
      folderId: args.folder,
      maxResults: args.maxResults ?? "50",
      startAt: args.startAt ?? "0"
    };
    const result = await request(
      "GET",
      "/testcases",
      void 0,
      params
    );
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }
  const allCases = [];
  let startAt = 0;
  let apiTotal = 0;
  const maxResults = 100;
  while (true) {
    const result = await request(
      "GET",
      "/testcases",
      void 0,
      {
        projectKey: args.project,
        folderId: args.folder,
        maxResults,
        startAt
      }
    );
    allCases.push(...result.values);
    apiTotal = result.total;
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }
  process.stdout.write(JSON.stringify({ values: allCases, total: apiTotal }, null, 2));
}

// src/commands/list-folders.ts
async function listFolders(args) {
  if (!args.project) throw new Error("--project is required");
  const allFolders = [];
  let startAt = 0;
  const maxResults = 100;
  while (true) {
    const result = await request(
      "GET",
      "/folders",
      void 0,
      {
        projectKey: args.project,
        folderType: "TEST_CASE",
        maxResults,
        startAt
      }
    );
    allFolders.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }
  process.stdout.write(JSON.stringify({ values: allFolders, total: allFolders.length }, null, 2));
}

// src/commands/create-folder.ts
var VALID_FOLDER_TYPES = ["TEST_CASE", "TEST_CYCLE", "TEST_PLAN"];
async function createFolder(args) {
  if (!args.project) throw new Error("--project is required");
  if (!args.name) throw new Error("--name is required");
  if (!args.type) throw new Error("--type is required");
  if (!VALID_FOLDER_TYPES.includes(args.type)) {
    throw new Error(
      `Invalid folder type: "${args.type}". Must be one of: ${VALID_FOLDER_TYPES.join(", ")}`
    );
  }
  const body = {
    projectKey: args.project,
    name: args.name,
    folderType: args.type
  };
  const result = await request("POST", "/folders", body);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/ensure-plan.ts
function planName(args) {
  if (args.name) return args.name;
  if (args.release) return `${args.release} Release Test Plan`;
  throw new Error("--name or --release is required");
}
function parseNumericId(flag, value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${flag} must be a positive numeric ID`);
  return id;
}
async function listAllPlans(project) {
  const plans = [];
  let startAt = 0;
  const maxResults = 100;
  while (true) {
    const result = await request(
      "GET",
      "/testplans",
      void 0,
      { projectKey: project, maxResults, startAt }
    );
    plans.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }
  return plans;
}
async function ensurePlan(args) {
  if (!args.project) throw new Error("--project is required");
  const name = planName(args);
  const folderId = args.folder ? parseNumericId("--folder", args.folder) : void 0;
  const existing = (await listAllPlans(args.project)).find((plan2) => plan2.name === name);
  if (existing) {
    process.stdout.write(JSON.stringify({ created: false, plan: existing }, null, 2));
    return;
  }
  const body = {
    projectKey: args.project,
    name
  };
  if (args.release) body.labels = [`release:${args.release}`];
  if (folderId) body.folderId = folderId;
  if (args.status) body.statusName = args.status;
  const plan = await request("POST", "/testplans", body);
  process.stdout.write(JSON.stringify({ created: true, plan }, null, 2));
}

// src/commands/ensure-cycle.ts
function parseNumericId2(flag, value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${flag} must be a positive numeric ID`);
  return id;
}
async function listAllCycles(project, jiraProjectVersionId) {
  const cycles = [];
  let startAt = 0;
  const maxResults = 100;
  while (true) {
    const result = await request(
      "GET",
      "/testcycles",
      void 0,
      { projectKey: project, jiraProjectVersionId, maxResults, startAt }
    );
    cycles.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }
  return cycles;
}
async function ensureCycle(args) {
  if (!args.project) throw new Error("--project is required");
  if (!args.name) throw new Error("--name is required");
  if (!args.jiraProjectVersionId) throw new Error("--jira-project-version-id is required");
  if (!args.plannedStartDate) throw new Error("--planned-start-date is required");
  if (!args.plannedEndDate) throw new Error("--planned-end-date is required");
  const jiraProjectVersionId = parseNumericId2("--jira-project-version-id", args.jiraProjectVersionId);
  const existing = (await listAllCycles(args.project, jiraProjectVersionId)).find(
    (cycle2) => cycle2.name === args.name
  );
  if (existing) {
    process.stdout.write(JSON.stringify({ created: false, cycle: existing }, null, 2));
    return;
  }
  const body = {
    projectKey: args.project,
    name: args.name,
    jiraProjectVersionId,
    plannedStartDate: args.plannedStartDate,
    plannedEndDate: args.plannedEndDate
  };
  if (args.description) body.description = args.description;
  if (args.folder) body.folderId = parseNumericId2("--folder", args.folder);
  if (args.status) body.statusName = args.status;
  const cycle = await request("POST", "/testcycles", body);
  process.stdout.write(JSON.stringify({ created: true, cycle }, null, 2));
}

// src/commands/link-plan-cycle.ts
function isLinked(plan, cycle) {
  return Boolean(plan.links?.testCycles?.some((link) => link.testCycleId === cycle.id || link.target?.endsWith(`/testcycles/${cycle.id}`) || link.target?.endsWith(`/testcycles/${cycle.key}`)));
}
async function linkPlanCycle(args) {
  if (!args.plan) throw new Error("--plan is required");
  if (!args.cycle) throw new Error("--cycle is required");
  const [plan, cycle] = await Promise.all([
    request("GET", `/testplans/${encodeURIComponent(args.plan)}`),
    request("GET", `/testcycles/${encodeURIComponent(args.cycle)}`)
  ]);
  if (isLinked(plan, cycle)) {
    process.stdout.write(JSON.stringify({ created: false, link: { testPlan: args.plan, testCycle: args.cycle } }, null, 2));
    return;
  }
  const link = await request(
    "POST",
    `/testplans/${encodeURIComponent(args.plan)}/links/testcycles`,
    { testCycleIdOrKey: args.cycle }
  );
  process.stdout.write(JSON.stringify({ created: true, link }, null, 2));
}

// src/commands/record-execution.ts
function executionComment(args) {
  const metadata = `Platform release: ${args.release}
Platform revision: ${args.revision}`;
  return args.comment ? `${metadata}

${args.comment}` : metadata;
}
function parseExecutionTime(value) {
  const executionTime = Number(value);
  if (!Number.isInteger(executionTime) || executionTime < 0) {
    throw new Error("--execution-time must be a non-negative integer");
  }
  return executionTime;
}
async function recordExecution(args) {
  if (!args.project) throw new Error("--project is required");
  if (!args.testCase) throw new Error("--test-case is required");
  if (!args.testCycle) throw new Error("--test-cycle is required");
  if (!args.status) throw new Error("--status is required");
  if (!args.release) throw new Error("--release is required");
  if (!args.revision) throw new Error("--revision is required");
  const body = {
    projectKey: args.project,
    testCaseKey: args.testCase,
    testCycleKey: args.testCycle,
    statusName: args.status,
    comment: executionComment(args)
  };
  if (args.environment) body.environmentName = args.environment;
  if (args.actualEndDate) body.actualEndDate = args.actualEndDate;
  if (args.executionTime) body.executionTime = parseExecutionTime(args.executionTime);
  const result = await request("POST", "/testexecutions", body);
  process.stdout.write(JSON.stringify(Object.keys(result).length ? result : { recorded: true }, null, 2));
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
var HELP = `
zephyr-cli \u2014 Zephyr Scale Cloud REST API CLI

Usage:
  zephyr-cli <command> [options]

Commands:
  create-case    Create a test case
  get-case       Get a test case by key
  get-steps      Get test steps for a test case
  update-case    Update a test case
  list-cases     List test cases in a project
  list-folders   List test case folders in a project
  create-folder  Create a folder
  ensure-plan    Create or reuse a release test plan
  ensure-cycle   Create or reuse a release-linked test cycle
  link-plan-cycle Link a test cycle to a test plan
  record-execution Record a test execution with release metadata

Options:
  --version      Show version
  --help         Show this help

create-case:
  --project <key>       Project key (required)
  --name <string>       Test case name (required)
  --folder <id>         Folder ID (required \u2014 cases without a folder are invisible in Zephyr UI)
  --objective <string>  What the test verifies
  --precondition <str>  Setup requirements
  --labels <csv>        Comma-separated labels
  --priority <string>   Priority name (High, Normal, Low)
  --status <string>     Status name (Draft, Approved)
  --steps <json>        Steps as JSON array

get-case:
  --key <key>           Test case key, e.g. PROJ-T42 (required)

get-steps:
  --key <key>           Test case key (required)

update-case:
  --key <key>           Test case key (required)
  --name <string>       New test case name
  --folder <id>         Move to folder by ID
  --objective <string>  What the test verifies
  --precondition <str>  Setup requirements
  --labels <csv>        Comma-separated labels
  --priority <string>   Priority name (High, Normal, Low)
  --status <string>     Status name (Draft, Approved)

list-cases:
  --project <key>       Project key (required)
  --folder <id>         Filter by folder ID
  --max-results <n>     Max results (default: 50)
  --start-at <n>        Pagination offset (default: 0)

list-folders:
  --project <key>       Project key (required)

create-folder:
  --project <key>       Project key (required)
  --name <string>       Folder name (required)
  --type <type>         TEST_CASE | TEST_CYCLE | TEST_PLAN (required)

ensure-plan:
  --project <key>       Project key (required)
  --release <string>    Platform release number; default name is "<release> Release Test Plan"
  --name <string>       Explicit test plan name
  --folder <id>         Folder ID
  --status <string>     Status name

ensure-cycle:
  --project <key>       Project key (required)
  --name <string>       Test cycle name (required)
  --jira-project-version-id <id> Jira Project Version ID from jira-cli (required)
  --planned-start-date <date> Planned start date (required)
  --planned-end-date <date> Planned end date (required)
  --description <string> Test cycle description
  --folder <id>         Folder ID
  --status <string>     Status name

link-plan-cycle:
  --plan <key|id>       Test plan key or ID (required)
  --cycle <key|id>      Test cycle key or ID (required)

record-execution:
  --project <key>       Project key (required)
  --test-case <key>     Test case key (required)
  --test-cycle <key>    Test cycle key (required)
  --status <string>     Execution status name (required)
  --release <string>    Platform release number (required)
  --revision <string>   Platform revision (required)
  --environment <name>  Environment name
  --actual-end-date <date> Actual end date
  --execution-time <ms> Execution time in milliseconds
  --comment <string>    Additional execution comment

Environment:
  ZEPHYR_API_TOKEN      Zephyr Scale API token (required)
`.trim();
function normalizeOptions(options) {
  const normalized = {};
  for (const [key, value] of Object.entries(options)) {
    const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    normalized[camelKey] = value;
  }
  return normalized;
}
async function main() {
  const args = process.argv.slice(2);
  const { positional, options } = parseArgs(args);
  if (options.version) {
    process.stdout.write("0.1.0");
    return;
  }
  if (options.help || positional.length === 0) {
    console.log(HELP);
    return;
  }
  const command = positional[0];
  const opts = normalizeOptions(options);
  const cmdArgs = opts;
  switch (command) {
    case "create-case":
      await createCase(cmdArgs);
      break;
    case "get-case":
      await getCase(cmdArgs);
      break;
    case "get-steps":
      await getSteps(cmdArgs);
      break;
    case "update-case":
      await updateCase(cmdArgs);
      break;
    case "list-cases":
      await listCases(cmdArgs);
      break;
    case "list-folders":
      await listFolders(cmdArgs);
      break;
    case "create-folder":
      await createFolder(cmdArgs);
      break;
    case "ensure-plan":
      await ensurePlan(cmdArgs);
      break;
    case "ensure-cycle":
      await ensureCycle(cmdArgs);
      break;
    case "link-plan-cycle":
      await linkPlanCycle(cmdArgs);
      break;
    case "record-execution":
      await recordExecution(cmdArgs);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}
main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
