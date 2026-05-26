#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/client.ts
var DEFAULT_BASE_URL = "https://app.testiny.io";
var MAX_RETRIES = 3;
var MAX_BACKOFF_MS = 1e4;
var FETCH_TIMEOUT_MS = 3e4;
function getApiKey() {
  const key = process.env.TESTINY_API_KEY;
  if (!key) {
    throw new Error(
      "TESTINY_API_KEY environment variable is required. Generate one at: Testiny \u2192 Settings \u2192 API keys."
    );
  }
  return key;
}
function getBaseUrl() {
  return `${process.env.TESTINY_APP_URL ?? DEFAULT_BASE_URL}/api/v1`;
}
async function request(method, path, body, params, attempt = 0) {
  const key = getApiKey();
  const url = new URL(`${getBaseUrl()}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== void 0 && v !== "") {
        url.searchParams.set(k, String(v));
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
        "X-Api-Key": key
      },
      ...body !== void 0 ? { body: JSON.stringify(body) } : {},
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
    const retryMs = Math.min(250 * 2 ** attempt, MAX_BACKOFF_MS);
    await new Promise((resolve) => setTimeout(resolve, retryMs));
    return request(method, path, body, params, attempt + 1);
  }
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Testiny API error ${response.status}: ${text2}`);
  }
  const text = await response.text();
  if (!text) return {};
  return JSON.parse(text);
}

// src/commands/create-case.ts
async function createCase(args) {
  if (!args.name) throw new Error("--name is required");
  const projectIdStr = args.project ?? process.env.TESTINY_PROJECT_ID;
  if (!projectIdStr) {
    throw new Error("--project or TESTINY_PROJECT_ID env is required");
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    throw new Error(`--project must be a numeric id, got: "${projectIdStr}"`);
  }
  const template = args.template ?? "STEPS";
  if (template !== "STEPS" && template !== "TEXT") {
    throw new Error(`--template must be STEPS or TEXT, got: "${template}"`);
  }
  const body = {
    project_id: projectId,
    title: args.name,
    template
  };
  if (template === "STEPS") {
    if (args.steps) body.steps_text = args.steps;
    if (args.precondition) body.precondition_text = args.precondition;
    if (args.expected) body.expected_result_text = args.expected;
  } else {
    if (args.content) body.content_text = args.content;
  }
  const result = await request("POST", "/testcase", body);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/get-case.ts
async function getCase(args) {
  if (!args.id) throw new Error("--id is required");
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);
  const result = await request("GET", `/testcase/${id}`);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/update-case.ts
async function updateCase(args) {
  if (!args.id) throw new Error("--id is required");
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);
  const existing = await request("GET", `/testcase/${id}`);
  const body = { _etag: existing._etag };
  if (args.name !== void 0) body.title = args.name;
  if (args.template !== void 0) {
    if (args.template !== "STEPS" && args.template !== "TEXT") {
      throw new Error(`--template must be STEPS or TEXT, got: "${args.template}"`);
    }
    body.template = args.template;
  }
  if (args.steps !== void 0) body.steps_text = args.steps;
  if (args.content !== void 0) body.content_text = args.content;
  if (args.precondition !== void 0) body.precondition_text = args.precondition;
  if (args.expected !== void 0) body.expected_result_text = args.expected;
  const result = await request("PUT", `/testcase/${id}`, body);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/list-cases.ts
async function listCases(args) {
  const projectIdStr = args.project ?? process.env.TESTINY_PROJECT_ID;
  if (!projectIdStr) {
    throw new Error("--project or TESTINY_PROJECT_ID env is required");
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    throw new Error(`--project must be a numeric id, got: "${projectIdStr}"`);
  }
  const limit = args.limit ? parseInt(args.limit, 10) : 50;
  if (isNaN(limit) || limit <= 0) {
    throw new Error(`--limit must be a positive number, got: "${args.limit}"`);
  }
  const result = await request(
    "POST",
    "/testcase/find",
    { filter: { project_id: projectId } }
  );
  const all = result.data ?? result.items ?? [];
  const values = all.slice(0, limit);
  const total = result.meta?.count ?? result.total ?? all.length;
  process.stdout.write(JSON.stringify({ values, total }, null, 2));
}

// src/commands/create-plan.ts
var fs = __toESM(require("fs/promises"));
var MAX_DESCRIPTION_CHARS = 16e3;
var CHUNK_SIZE_TARGET = 15500;
async function createPlan(args) {
  if (!args.name) throw new Error("--name is required");
  if (args.description && args.descriptionFile) {
    throw new Error("Pass either --description or --description-file, not both");
  }
  const projectIdStr = args.project ?? process.env.TESTINY_PROJECT_ID;
  if (!projectIdStr) {
    throw new Error("--project or TESTINY_PROJECT_ID env is required");
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    throw new Error(`--project must be a numeric id, got: "${projectIdStr}"`);
  }
  let description = args.description;
  if (args.descriptionFile) {
    description = await fs.readFile(args.descriptionFile, "utf8");
  }
  if (!description || description.length <= MAX_DESCRIPTION_CHARS) {
    const body = {
      project_id: projectId,
      title: args.name
    };
    if (description) body.description = description;
    const result = await request("POST", "/testplan", body);
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }
  if (args.chunked !== "true") {
    throw new Error(
      `description is ${description.length} chars; Testiny limits TestPlan.description to ${MAX_DESCRIPTION_CHARS}. Pass --chunked to split into multiple linked plans at section boundaries.`
    );
  }
  const chunks = splitAtSections(description, CHUNK_SIZE_TARGET);
  const total = chunks.length;
  const totalChars = description.length;
  const created = [];
  for (let i = 0; i < total; i++) {
    const partNumber = i + 1;
    const body = {
      project_id: projectId,
      title: `${args.name} (Part ${partNumber} of ${total})`,
      description: withChunkFooter(chunks[i], partNumber, total, args.name, totalChars)
    };
    const result = await request("POST", "/testplan", body);
    created.push(result);
  }
  process.stdout.write(
    JSON.stringify(
      {
        chunked: true,
        total_parts: total,
        original_chars: totalChars,
        plans: created.map((p) => ({ id: p.id, title: p.title }))
      },
      null,
      2
    )
  );
}
function withChunkFooter(chunk, partNumber, total, planName, originalChars) {
  const footer = `

---
*Part ${partNumber} of ${total} of "${planName}". The original source (${originalChars} chars) exceeded Testiny's ${MAX_DESCRIPTION_CHARS}-char-per-plan description limit, so it was split at section boundaries. Sibling parts are titled "${planName} (Part N of ${total})" \u2014 search Test Plans by title to find them.*`;
  return chunk + footer;
}
function splitAtSections(text, maxSize) {
  if (text.length <= maxSize) return [text];
  const sections = splitKeepDelimiter(text, /^(?=## )/m);
  return greedyPack(
    sections,
    maxSize,
    (oversized) => splitAtSubsections(oversized, maxSize)
  );
}
function splitAtSubsections(text, maxSize) {
  const subs = splitKeepDelimiter(text, /^(?=### )/m);
  if (subs.length > 1) {
    return greedyPack(subs, maxSize, (oversized) => splitAtLines(oversized, maxSize));
  }
  return splitAtLines(text, maxSize);
}
function splitAtLines(text, maxSize) {
  const lines = text.split("\n").map((l, i, arr) => i < arr.length - 1 ? l + "\n" : l);
  return greedyPack(lines, maxSize, (oversized) => hardSlice(oversized, maxSize));
}
function hardSlice(text, maxSize) {
  const out = [];
  for (let i = 0; i < text.length; i += maxSize) {
    out.push(text.slice(i, i + maxSize));
  }
  return out;
}
function splitKeepDelimiter(text, pattern) {
  return text.split(pattern);
}
function greedyPack(parts, maxSize, recurse) {
  const chunks = [];
  let current = "";
  const flush = () => {
    if (current.length > 0) {
      chunks.push(current);
      current = "";
    }
  };
  for (const part of parts) {
    if (part.length === 0) continue;
    if (part.length > maxSize) {
      flush();
      const sub = recurse(part);
      if (sub.length === 0) continue;
      for (let i = 0; i < sub.length - 1; i++) chunks.push(sub[i]);
      const last = sub[sub.length - 1];
      if (last.length < maxSize) {
        current = last;
      } else {
        chunks.push(last);
      }
    } else if (current.length + part.length > maxSize) {
      flush();
      current = part;
    } else {
      current += part;
    }
  }
  flush();
  return chunks;
}

// src/commands/get-plan.ts
async function getPlan(args) {
  if (!args.id) throw new Error("--id is required");
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);
  const result = await request("GET", `/testplan/${id}`);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/update-plan.ts
async function updatePlan(args) {
  if (!args.id) throw new Error("--id is required");
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);
  const body = {};
  if (args.name !== void 0) body.title = args.name;
  if (args.description !== void 0) body.description = args.description;
  const result = await request("PUT", `/testplan/${id}`, body);
  process.stdout.write(JSON.stringify(result, null, 2));
}

// src/commands/list-plans.ts
async function listPlans(args) {
  const projectIdStr = args.project ?? process.env.TESTINY_PROJECT_ID;
  if (!projectIdStr) {
    throw new Error("--project or TESTINY_PROJECT_ID env is required");
  }
  const projectId = parseInt(projectIdStr, 10);
  if (isNaN(projectId)) {
    throw new Error(`--project must be a numeric id, got: "${projectIdStr}"`);
  }
  const limit = args.limit ? parseInt(args.limit, 10) : 50;
  if (isNaN(limit) || limit <= 0) {
    throw new Error(`--limit must be a positive number, got: "${args.limit}"`);
  }
  const result = await request(
    "POST",
    "/testplan/find",
    { filter: { project_id: projectId } }
  );
  const all = result.data ?? result.items ?? [];
  const values = all.slice(0, limit);
  const total = result.meta?.count ?? result.total ?? all.length;
  process.stdout.write(JSON.stringify({ values, total }, null, 2));
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
testiny-cli \u2014 Testiny REST API CLI

Usage:
  testiny-cli <command> [options]

Commands:
  create-case    Create a test case
  get-case       Get a test case by numeric id
  update-case    Update a test case (handles _etag concurrency)
  list-cases     List test cases for a project
  create-plan    Create a test plan
  get-plan       Get a test plan by numeric id
  update-plan    Update a test plan (handles _etag concurrency)
  list-plans     List test plans for a project

Options:
  --version      Show version
  --help         Show this help

create-case:
  --project <id>            Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --name <string>           Test case title (required)
  --template <STEPS|TEXT>   Default: STEPS
  --steps <string>          Steps body (STEPS template) \u2014 free-form, supports \\n
  --content <string>        Content body (TEXT template) \u2014 free-form markdown
  --precondition <string>   Setup requirements (STEPS template)
  --expected <string>       Expected result (STEPS template)

get-case:
  --id <number>             Numeric test case id (required)

update-case:
  --id <number>             Numeric test case id (required)
  --name <string>           New title
  --template <STEPS|TEXT>   Change template
  --steps <string>          Replace steps_text (STEPS)
  --content <string>        Replace content_text (TEXT)
  --precondition <string>   Replace precondition_text
  --expected <string>       Replace expected_result_text

list-cases:
  --project <id>            Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --limit <n>               Max results (default: 50)

create-plan:
  --project <id>             Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --name <string>            Plan name (required)
  --description <string>     Plan description / scope (optional, supports markdown)
  --description-file <path>  Read description from a file (mutually exclusive with --description)
  --chunked                  When description > 16K (Testiny's limit), split into multiple
                             linked plans at section boundaries (## then ### then lines).
                             Each part is titled "<name> (Part N of M)".

get-plan:
  --id <number>             Numeric test plan id (required)

update-plan:
  --id <number>             Numeric test plan id (required)
  --name <string>           New name
  --description <string>    New description

list-plans:
  --project <id>            Numeric project id (defaults to TESTINY_PROJECT_ID env)
  --limit <n>               Max results (default: 50)

Environment:
  TESTINY_API_KEY           Testiny API key (required; sent as X-Api-Key header)
  TESTINY_PROJECT_ID        Default numeric project id (optional)
  TESTINY_APP_URL           Base URL (default: https://app.testiny.io)

Notes:
  - Folder support is not yet shipped; cases/plans land at project root.
  - update-* fetches the resource first to capture _etag (required by Testiny).
  - Duplicate titles/names are allowed; agents should search before create when needed.
  - For Playwright run upload, use the official @testiny/cli automation importer
    (\`npx --package=@testiny/cli@latest testiny-importer automation ...\`) \u2014
    TestRun CRUD is not exposed here.
  - Testiny limits TestPlan.description to 16,000 chars. Use --chunked on
    create-plan to migrate larger plans by splitting at section boundaries.
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
    process.stdout.write("0.2.2");
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
    case "update-case":
      await updateCase(cmdArgs);
      break;
    case "list-cases":
      await listCases(cmdArgs);
      break;
    case "create-plan":
      await createPlan(cmdArgs);
      break;
    case "get-plan":
      await getPlan(cmdArgs);
      break;
    case "update-plan":
      await updatePlan(cmdArgs);
      break;
    case "list-plans":
      await listPlans(cmdArgs);
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
