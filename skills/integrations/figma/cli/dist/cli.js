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

// src/figma-client.ts
var MAX_RETRIES = 1;
function getToken() {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "FIGMA_ACCESS_TOKEN environment variable is required. Set it to your Figma OAuth token."
    );
  }
  return token;
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function request(endpoint, params, attempt = 0) {
  const token = getToken();
  let url = `https://api.figma.com/v1${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }
  const isOAuth = token.startsWith("figu_");
  const headers = { Accept: "application/json" };
  if (isOAuth) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["X-Figma-Token"] = token;
  }
  const response = await fetch(url, { method: "GET", headers });
  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
    await delay(retryAfter * 1e3);
    return request(endpoint, params, attempt + 1);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Figma API error ${response.status}: ${text}`);
  }
  return await response.json();
}

// src/commands/file.ts
async function getFile(fileKey, depth) {
  if (!fileKey) {
    throw new Error("File key is required");
  }
  const params = {};
  if (depth) params.depth = depth;
  const data = await request(`/files/${fileKey}`, params);
  const pages = data.document.children?.map((page) => ({
    id: page.id,
    name: page.name,
    type: page.type,
    childCount: page.children?.length || 0
  })) || [];
  const output = {
    name: data.name,
    lastModified: data.lastModified,
    version: data.version,
    role: data.role,
    editorType: data.editorType,
    pages
  };
  console.log(JSON.stringify(output));
}
async function getFileMeta(fileKey) {
  if (!fileKey) {
    throw new Error("File key is required");
  }
  const data = await request(`/files/${fileKey}`, { depth: "1" });
  const output = {
    name: data.name,
    lastModified: data.lastModified,
    version: data.version,
    role: data.role,
    editorType: data.editorType,
    pageCount: data.document.children?.length || 0,
    pageNames: data.document.children?.map((p) => p.name) || []
  };
  console.log(JSON.stringify(output));
}
async function getNodes(fileKey, ids, depth) {
  if (!fileKey) {
    throw new Error("File key is required");
  }
  if (!ids) {
    throw new Error("Node IDs are required (--ids)");
  }
  const params = { ids };
  if (depth) params.depth = depth;
  const data = await request(`/files/${fileKey}/nodes`, params);
  const output = Object.entries(data.nodes).map(([nodeId, node]) => ({
    id: nodeId,
    name: node.document.name,
    type: node.document.type,
    children: node.document.children?.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type
    })) || []
  }));
  console.log(JSON.stringify(output));
}

// src/commands/component.ts
async function listComponents(fileKey) {
  if (!fileKey) {
    throw new Error("File key is required (--file)");
  }
  const data = await request(
    `/files/${fileKey}/components`
  );
  const components = data.meta.components || [];
  const output = components.map((c) => ({
    key: c.key,
    name: c.name,
    description: c.description,
    nodeId: c.node_id,
    containingFrame: c.containing_frame?.name || "",
    pageName: c.containing_frame?.pageName || ""
  }));
  console.log(JSON.stringify(output));
}
async function getComponent(componentKey) {
  if (!componentKey) {
    throw new Error("Component key is required");
  }
  const data = await request(`/components/${componentKey}`);
  const c = data.meta;
  const output = {
    key: c.key,
    fileKey: c.file_key,
    name: c.name,
    description: c.description,
    nodeId: c.node_id,
    thumbnailUrl: c.thumbnail_url,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    containingFrame: c.containing_frame?.name || "",
    pageName: c.containing_frame?.pageName || ""
  };
  console.log(JSON.stringify(output));
}
async function listComponentSets(fileKey) {
  if (!fileKey) {
    throw new Error("File key is required (--file)");
  }
  const data = await request(
    `/files/${fileKey}/component_sets`
  );
  const sets = data.meta.component_sets || [];
  const output = sets.map((s) => ({
    key: s.key,
    name: s.name,
    description: s.description,
    nodeId: s.node_id
  }));
  console.log(JSON.stringify(output));
}

// src/commands/image.ts
async function exportImages(fileKey, ids, scale, format) {
  if (!fileKey) {
    throw new Error("File key is required");
  }
  if (!ids) {
    throw new Error("Node IDs are required (--ids)");
  }
  const params = { ids };
  if (scale) params.scale = scale;
  if (format) params.format = format;
  const data = await request(`/images/${fileKey}`, params);
  if (data.err) {
    throw new Error(`Figma image export error: ${data.err}`);
  }
  const output = Object.entries(data.images).map(([nodeId, url]) => ({
    nodeId,
    url: url || null
  }));
  console.log(JSON.stringify(output));
}

// src/commands/style.ts
async function listStyles(fileKey) {
  if (!fileKey) {
    throw new Error("File key is required (--file)");
  }
  const data = await request(
    `/files/${fileKey}/styles`
  );
  const styles = data.meta.styles || [];
  const output = styles.map((s) => ({
    key: s.key,
    name: s.name,
    styleType: s.style_type,
    description: s.description,
    nodeId: s.node_id
  }));
  console.log(JSON.stringify(output));
}
async function getStyle(styleKey) {
  if (!styleKey) {
    throw new Error("Style key is required");
  }
  const data = await request(`/styles/${styleKey}`);
  const s = data.meta;
  const output = {
    key: s.key,
    fileKey: s.file_key,
    name: s.name,
    styleType: s.style_type,
    description: s.description,
    nodeId: s.node_id,
    thumbnailUrl: s.thumbnail_url
  };
  console.log(JSON.stringify(output));
}

// src/commands/team.ts
async function listProjects(teamId) {
  if (!teamId) {
    teamId = process.env.FIGMA_TEAM_ID || "";
  }
  if (!teamId) {
    throw new Error("Team ID is required. Provide it as an argument or set FIGMA_TEAM_ID.");
  }
  const data = await request(
    `/teams/${teamId}/projects`
  );
  const output = (data.projects || []).map((p) => ({
    id: p.id,
    name: p.name
  }));
  console.log(JSON.stringify(output));
}

// src/commands/project.ts
async function listFiles(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }
  const data = await request(
    `/projects/${projectId}/files`
  );
  const output = (data.files || []).map((f) => ({
    key: f.key,
    name: f.name,
    lastModified: f.last_modified,
    thumbnailUrl: f.thumbnail_url
  }));
  console.log(JSON.stringify(output));
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
var HELP = `figma-cli \u2014 Read-only Figma design CLI

Usage:
  figma-cli <resource> <action> [options]

Resources & Actions:

  team projects  [team-id]              (defaults to FIGMA_TEAM_ID env var)
  project files  <project-id>

  file get       <file-key> [--depth N]
  file meta      <file-key>
  file nodes     <file-key> --ids <node-ids>  [--depth N]

  component list --file <file-key>
  component get  <component-key>
  component sets --file <file-key>

  image export   <file-key> --ids <node-ids> [--scale N] [--format png|jpg|svg|pdf]

  style list     --file <file-key>
  style get      <style-key>

Environment Variables:
  FIGMA_ACCESS_TOKEN   OAuth token (required)
  FIGMA_TEAM_ID        Default team ID for discovery (optional)

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
      case "team":
        if (action === "projects") {
          await listProjects(positional[2] || "");
        } else {
          console.error(JSON.stringify({ error: `Unknown action: team ${action || "(none)"}. Use --help for usage.` }));
          process.exit(1);
        }
        break;
      case "project":
        if (action === "files") {
          await listFiles(positional[2] || "");
        } else {
          console.error(JSON.stringify({ error: `Unknown action: project ${action || "(none)"}. Use --help for usage.` }));
          process.exit(1);
        }
        break;
      case "file":
        switch (action) {
          case "get":
            await getFile(positional[2], getOpt(options, "depth"));
            break;
          case "meta":
            await getFileMeta(positional[2]);
            break;
          case "nodes":
            await getNodes(positional[2], getOpt(options, "ids") || "", getOpt(options, "depth"));
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: file ${action || "(none)"}. Use --help for usage.` }));
            process.exit(1);
        }
        break;
      case "component":
        switch (action) {
          case "list":
            await listComponents(getOpt(options, "file") || "");
            break;
          case "get":
            await getComponent(positional[2]);
            break;
          case "sets":
            await listComponentSets(getOpt(options, "file") || "");
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: component ${action || "(none)"}. Use --help for usage.` }));
            process.exit(1);
        }
        break;
      case "image":
        if (action === "export") {
          await exportImages(
            positional[2],
            getOpt(options, "ids") || "",
            getOpt(options, "scale"),
            getOpt(options, "format")
          );
        } else {
          console.error(JSON.stringify({ error: `Unknown action: image ${action || "(none)"}. Use --help for usage.` }));
          process.exit(1);
        }
        break;
      case "style":
        switch (action) {
          case "list":
            await listStyles(getOpt(options, "file") || "");
            break;
          case "get":
            await getStyle(positional[2]);
            break;
          default:
            console.error(JSON.stringify({ error: `Unknown action: style ${action || "(none)"}. Use --help for usage.` }));
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
