#!/usr/bin/env node
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/cli.ts
var cli_exports = {};
__export(cli_exports, {
  main: () => main
});
module.exports = __toCommonJS(cli_exports);

// src/notion-client.ts
var BASE_URL = "https://api.notion.com";
var NOTION_VERSION = "2022-06-28";
var MAX_RETRIES = 1;
function getToken() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error(
      "NOTION_TOKEN environment variable is required. Set it to your Notion integration token."
    );
  }
  return token;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function request(method, path, body, attempt = 0) {
  const token = getToken();
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    }
  };
  if (body && (method === "POST" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
    await delay(retryAfter * 1e3);
    return request(method, path, body, attempt + 1);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API error ${response.status}: ${text}`);
  }
  return await response.json();
}
function richTextToPlain(richText) {
  return richText.map((rt) => rt.plain_text).join("");
}
function extractPlainText(blocks) {
  const lines = [];
  for (const block of blocks) {
    const type = block.type;
    const data = block[type];
    if (data?.rich_text) {
      const text = richTextToPlain(data.rich_text);
      if (text) lines.push(text);
    }
  }
  return lines.join("\n");
}

// src/commands/search.ts
async function search(query, filter, limit) {
  if (!query) {
    throw new Error("Search query is required (--query)");
  }
  const body = {
    query,
    page_size: limit ? parseInt(limit, 10) : 25
  };
  if (filter === "page" || filter === "database") {
    body.filter = { value: filter, property: "object" };
  }
  const data = await request("POST", "/v1/search", body);
  console.log(JSON.stringify({
    results: data.results,
    has_more: data.has_more,
    next_cursor: data.next_cursor
  }));
}

// src/commands/page.ts
async function getPage(pageId) {
  if (!pageId) {
    throw new Error("Page ID is required");
  }
  const page = await request("GET", `/v1/pages/${pageId}`);
  const blocks = await request("GET", `/v1/blocks/${pageId}/children`);
  const content = extractPlainText(blocks.results);
  console.log(JSON.stringify({
    id: page.id,
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    properties: page.properties,
    content
  }));
}
async function createPage(parentDbId, title, propertiesJson) {
  if (!parentDbId) {
    throw new Error("Parent database ID is required (--parent)");
  }
  if (!title) {
    throw new Error("Title is required (--title)");
  }
  let extraProperties = {};
  if (propertiesJson) {
    try {
      extraProperties = JSON.parse(propertiesJson);
    } catch {
      throw new Error("Invalid JSON for --properties. Provide a valid JSON string.");
    }
  }
  const body = {
    parent: { database_id: parentDbId },
    properties: {
      Name: {
        title: [{ text: { content: title } }]
      },
      ...extraProperties
    }
  };
  const page = await request("POST", "/v1/pages", body);
  console.log(JSON.stringify({
    id: page.id,
    url: page.url,
    properties: page.properties
  }));
}
async function updatePage(pageId, propertiesJson) {
  if (!pageId) {
    throw new Error("Page ID is required");
  }
  if (!propertiesJson) {
    throw new Error("Properties JSON is required (--properties)");
  }
  let properties;
  try {
    properties = JSON.parse(propertiesJson);
  } catch {
    throw new Error("Invalid JSON for --properties. Provide a valid JSON string.");
  }
  const page = await request("PATCH", `/v1/pages/${pageId}`, { properties });
  console.log(JSON.stringify({
    id: page.id,
    url: page.url,
    properties: page.properties
  }));
}

// src/commands/database.ts
async function getDatabase(dbId) {
  if (!dbId) {
    throw new Error("Database ID is required");
  }
  const db = await request("GET", `/v1/databases/${dbId}`);
  console.log(JSON.stringify({
    id: db.id,
    url: db.url,
    title: db.title,
    properties: db.properties
  }));
}
async function queryDatabase(dbId, filterJson, limit) {
  if (!dbId) {
    throw new Error("Database ID is required");
  }
  const body = {
    page_size: limit ? parseInt(limit, 10) : 25
  };
  if (filterJson) {
    try {
      body.filter = JSON.parse(filterJson);
    } catch {
      throw new Error("Invalid JSON for --filter. Provide a valid JSON string.");
    }
  }
  const data = await request("POST", `/v1/databases/${dbId}/query`, body);
  console.log(JSON.stringify({
    results: data.results,
    has_more: data.has_more,
    next_cursor: data.next_cursor
  }));
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
var HELP = `notion-cli \u2014 Notion REST API CLI

Usage:
  notion-cli <resource> <action> [options]

Resources & Actions:

  search         --query "text" [--filter page|database] [--limit N]
  page get       <page-id>
  page create    --parent <database-id> --title "..." [--properties '{"Status":...}']
  page update    <page-id> --properties '{"Status":...}'
  database get   <database-id>
  database query <database-id> [--filter '{"property":"Status",...}'] [--limit N]

Environment Variables:
  NOTION_TOKEN   Notion integration token (required)

Options:
  --help, -h     Show this help message`;
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
      case "search": {
        const query = getOpt(options, "query");
        if (!query) {
          console.error(JSON.stringify({ error: "search requires --query. Use --help for usage." }));
          process.exit(1);
        }
        const filter = getOpt(options, "filter");
        const limit = getOpt(options, "limit");
        await search(query, filter, limit);
        break;
      }
      case "page":
        switch (action) {
          case "get":
            await getPage(positional[2]);
            break;
          case "create":
            await createPage(
              getOpt(options, "parent") || "",
              getOpt(options, "title") || "",
              getOpt(options, "properties")
            );
            break;
          case "update":
            await updatePage(
              positional[2],
              getOpt(options, "properties") || ""
            );
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: page ${action || "(none)"}. Use --help for usage.` }));
            process.exit(1);
        }
        break;
      case "database":
        switch (action) {
          case "get":
            await getDatabase(positional[2]);
            break;
          case "query":
            await queryDatabase(
              positional[2],
              getOpt(options, "filter"),
              getOpt(options, "limit")
            );
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: database ${action || "(none)"}. Use --help for usage.` }));
            process.exit(1);
        }
        break;
      default:
        console.error(JSON.stringify({ error: `Unknown resource: ${resource}. Use --help for usage.` }));
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ error: message }));
    process.exit(1);
  }
}
main().catch(() => {
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
