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

// src/confluence-client.ts
var MAX_RETRIES = 1;
function getToken() {
  const token = process.env.CONFLUENCE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "CONFLUENCE_ACCESS_TOKEN environment variable is required. Set it to your Confluence Cloud OAuth token."
    );
  }
  return token;
}
function getCloudId() {
  const cloudId = process.env.CONFLUENCE_CLOUD_ID;
  if (!cloudId) {
    throw new Error(
      "CONFLUENCE_CLOUD_ID environment variable is required. Set it to your Atlassian Cloud site ID."
    );
  }
  return cloudId;
}
function getBaseUrl(cloudId) {
  return `https://api.atlassian.com/ex/confluence/${cloudId}/wiki/rest/api`;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function request(endpoint, params, attempt = 0) {
  const token = getToken();
  const cloudId = getCloudId();
  const baseUrl = getBaseUrl(cloudId);
  let url = `${baseUrl}${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
  });
  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
    await delay(retryAfter * 1e3);
    return request(endpoint, params, attempt + 1);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Confluence API error ${response.status}: ${text}`);
  }
  return await response.json();
}
function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li|tr|td|th|blockquote)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// src/commands/space.ts
async function listSpaces() {
  const data = await request("/search", {
    cql: "type=space",
    limit: "50"
  });
  const output = data.results.map((r) => ({
    key: r.space?.key || "",
    name: r.space?.name || "",
    type: r.space?.type || "",
    status: r.space?.status || ""
  }));
  console.log(JSON.stringify(output));
}

// src/commands/page.ts
async function getPage(pageId) {
  if (!pageId) {
    throw new Error("Page ID is required");
  }
  const data = await request("/search", {
    cql: `id=${pageId} AND type=page`,
    limit: "1",
    expand: "content.body.storage,content.space,content.version,content.metadata.labels"
  });
  if (data.results.length === 0) {
    throw new Error(`Page ${pageId} not found`);
  }
  const content = data.results[0].content;
  const output = {
    id: content.id,
    title: content.title,
    status: content.status,
    spaceKey: content.space?.key || "",
    version: content.version ? { number: content.version.number } : void 0,
    labels: content.metadata?.labels?.results.map((l) => l.name) || [],
    body: content.body?.storage?.value ? stripHtml(content.body.storage.value) : "",
    url: content._links?.webui || ""
  };
  console.log(JSON.stringify(output));
}
async function listChildren(pageId, limit) {
  if (!pageId) {
    throw new Error("Page ID is required");
  }
  const data = await request("/search", {
    cql: `parent=${pageId} AND type=page`,
    limit: limit || "25"
  });
  const output = data.results.map((r) => ({
    id: r.content.id,
    title: r.content.title,
    status: r.content.status
  }));
  console.log(JSON.stringify(output));
}

// src/commands/search.ts
async function searchCQL(cql, limit) {
  if (!cql) {
    throw new Error("CQL query is required (--cql)");
  }
  const params = {
    cql,
    limit: limit || "25"
  };
  const data = await request("/search", params);
  const output = data.results.map((r) => ({
    id: r.content.id,
    type: r.content.type,
    title: r.content.title,
    status: r.content.status,
    space: r.resultGlobalContainer?.title || "",
    url: r.url,
    excerpt: r.excerpt || ""
  }));
  console.log(JSON.stringify(output));
}
async function searchText(query, limit) {
  if (!query) {
    throw new Error("Search query is required (--query)");
  }
  const cql = `text ~ "${query}" AND type = page`;
  await searchCQL(cql, limit);
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
var HELP = `confluence-cli \u2014 Read-only Confluence documentation CLI

Usage:
  confluence-cli <resource> <action> [options]

Resources & Actions:

  space list
  page get       <page-id>
  page children  <page-id> [--limit N]
  search         --cql "CQL query" [--limit N]
  search         --query "text" [--limit N]

Environment Variables:
  CONFLUENCE_ACCESS_TOKEN   OAuth token (required)
  CONFLUENCE_CLOUD_ID       Atlassian Cloud site ID (required)

Options:
  --help, -h        Show this help message`;
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
      case "space":
        if (action === "list") {
          await listSpaces();
        } else {
          console.error(JSON.stringify({ error: `Unknown action: space ${action || "(none)"}. Use --help for usage.` }));
          process.exit(1);
        }
        break;
      case "page":
        switch (action) {
          case "get":
            await getPage(positional[2]);
            break;
          case "children":
            await listChildren(positional[2], getOpt(options, "limit"));
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: page ${action || "(none)"}. Use --help for usage.` }));
            process.exit(1);
        }
        break;
      case "search": {
        const cql = getOpt(options, "cql");
        const query = getOpt(options, "query");
        const limit = getOpt(options, "limit");
        if (cql) {
          await searchCQL(cql, limit);
        } else if (query) {
          await searchText(query, limit);
        } else {
          console.error(JSON.stringify({ error: "search requires --cql or --query. Use --help for usage." }));
          process.exit(1);
        }
        break;
      }
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
