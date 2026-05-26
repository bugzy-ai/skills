#!/usr/bin/env node
"use strict";

// src/cli.ts
var import_config = require("dotenv/config");
var import_commander4 = require("commander");

// src/logger.ts
var import_fs = require("fs");
var import_path = require("path");
var Logger = class {
  logDir;
  logFile;
  enabled;
  constructor() {
    this.enabled = !!process.env.ASANA_MCP_DEBUG;
    this.logDir = ".asana-mcp";
    this.logFile = (0, import_path.join)(this.logDir, "mcp.log");
    if (this.enabled) {
      this.ensureLogDir();
    }
  }
  ensureLogDir() {
    if (!(0, import_fs.existsSync)(this.logDir)) {
      (0, import_fs.mkdirSync)(this.logDir, { recursive: true });
    }
  }
  formatMessage(level, prefix, ...args) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const message = args.map((arg) => {
      if (arg instanceof Error) {
        return JSON.stringify({
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
          cause: arg.cause
        });
      }
      return typeof arg === "object" ? JSON.stringify(arg) : String(arg);
    }).join(" ");
    return `[${timestamp}] [${level}] ${prefix} ${message}
`;
  }
  log(prefix, ...args) {
    if (!this.enabled) return;
    try {
      const message = this.formatMessage("INFO", prefix, ...args);
      (0, import_fs.appendFileSync)(this.logFile, message);
    } catch {
    }
  }
  error(prefix, ...args) {
    if (!this.enabled) return;
    try {
      const message = this.formatMessage("ERROR", prefix, ...args);
      (0, import_fs.appendFileSync)(this.logFile, message);
    } catch {
    }
  }
  warn(prefix, ...args) {
    if (!this.enabled) return;
    try {
      const message = this.formatMessage("WARN", prefix, ...args);
      (0, import_fs.appendFileSync)(this.logFile, message);
    } catch {
    }
  }
};
var logger = new Logger();

// src/asana-client.ts
var AsanaClientError = class extends Error {
  constructor(message, statusCode, asanaErrors) {
    super(message);
    this.statusCode = statusCode;
    this.asanaErrors = asanaErrors;
    this.name = "AsanaClientError";
  }
};
var BASE_URL = "https://app.asana.com/api/1.0";
var MAX_RETRIES = 3;
var TASK_LIST_FIELDS = "gid,name,assignee,assignee.name,completed,due_on,permalink_url,projects,projects.name";
var TASK_DETAIL_FIELDS = "gid,name,assignee,assignee.name,assignee.email,completed,completed_at,created_at,modified_at,due_on,due_at,notes,permalink_url,projects,projects.name,tags,tags.name,memberships,memberships.project,memberships.project.name,memberships.section,memberships.section.name,parent,parent.name,num_subtasks,custom_fields,custom_fields.name,custom_fields.display_value";
var PROJECT_LIST_FIELDS = "gid,name,archived,color,owner,owner.name,created_at,modified_at";
var SECTION_LIST_FIELDS = "gid,name";
var AsanaClient = class {
  accessToken;
  defaultWorkspaceGid;
  constructor() {
    const token = process.env.ASANA_ACCESS_TOKEN;
    if (!token) {
      throw new Error("ASANA_ACCESS_TOKEN environment variable is required");
    }
    this.accessToken = token;
    const workspaceGid = process.env.ASANA_WORKSPACE_GID;
    if (!workspaceGid) {
      throw new Error("ASANA_WORKSPACE_GID environment variable is required");
    }
    this.defaultWorkspaceGid = workspaceGid;
  }
  /**
   * Resolve workspace GID: explicit parameter overrides env var default
   */
  resolveWorkspace(workspaceGid) {
    return workspaceGid || this.defaultWorkspaceGid;
  }
  /**
   * Delay helper for retry logic
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  /**
   * Make an HTTP request to the Asana API with retry logic for rate limiting
   */
  async request(method, endpoint, body, attempt = 0) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json"
    };
    const options = { method, headers };
    if (body) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    logger.log("[AsanaClient]", `REQUEST: ${method} ${url}`);
    if (body) {
      logger.log("[AsanaClient]", "REQUEST BODY:", body);
    }
    let response;
    try {
      response = await fetch(url, options);
    } catch (fetchError) {
      logger.error("[AsanaClient]", "FETCH ERROR:", fetchError);
      throw new AsanaClientError(
        `Network error: ${fetchError instanceof Error ? fetchError.message : "Unknown"}`
      );
    }
    logger.log(
      "[AsanaClient]",
      `RESPONSE: ${response.status} ${response.statusText}`
    );
    const responseText = await response.text();
    logger.log(
      "[AsanaClient]",
      "RESPONSE BODY:",
      responseText.substring(0, 2e3)
    );
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "5",
        10
      );
      const delayMs = retryAfter * 1e3;
      logger.warn(
        "[AsanaClient]",
        `Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await this.delay(delayMs);
      return this.request(method, endpoint, body, attempt + 1);
    }
    if (!response.ok) {
      let errorData;
      let message;
      try {
        errorData = JSON.parse(responseText);
        const errorMessages = errorData.errors?.map((e) => e.message) || [];
        message = errorMessages.length > 0 ? errorMessages.join("; ") : `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        const snippet = responseText.slice(0, 200).replace(/\s+/g, " ").trim();
        message = snippet ? `HTTP ${response.status}: ${snippet}` : `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new AsanaClientError(
        message.startsWith("HTTP ") ? message : `HTTP ${response.status}: ${message}`,
        response.status,
        errorData
      );
    }
    if (response.status === 204 || !responseText) {
      return {};
    }
    return JSON.parse(responseText);
  }
  /**
   * Search tasks in a workspace
   */
  async searchTasks(options) {
    const workspace = this.resolveWorkspace(options.workspaceGid);
    const params = new URLSearchParams();
    params.set("text", options.query);
    params.set("opt_fields", TASK_LIST_FIELDS);
    if (options.assignee) {
      params.set("assignee.any", options.assignee);
    }
    if (options.projectGid) {
      params.set("projects.any", options.projectGid);
    }
    if (options.completed !== void 0) {
      params.set("completed", String(options.completed));
    } else {
      params.set("completed", "false");
    }
    if (options.limit) {
      params.set("limit", String(options.limit));
    }
    return this.request(
      "GET",
      `/workspaces/${workspace}/tasks/search?${params.toString()}`
    );
  }
  /**
   * Get a single task by GID
   */
  async getTask(taskGid) {
    return this.request(
      "GET",
      `/tasks/${taskGid}?opt_fields=${TASK_DETAIL_FIELDS}`
    );
  }
  /**
   * Create a new task
   */
  async createTask(options) {
    const workspace = this.resolveWorkspace(options.workspaceGid);
    const taskData = {
      name: options.name,
      projects: [options.projectGid]
    };
    if (options.description) taskData.notes = options.description;
    if (options.assigneeGid) taskData.assignee = options.assigneeGid;
    if (options.dueDate) taskData.due_on = options.dueDate;
    return this.request(
      "POST",
      `/tasks?opt_fields=${TASK_DETAIL_FIELDS}`,
      { data: taskData }
    );
  }
  /**
   * Update an existing task
   */
  async updateTask(taskGid, updates) {
    const taskData = {};
    if (updates.name !== void 0) taskData.name = updates.name;
    if (updates.completed !== void 0) taskData.completed = updates.completed;
    if (updates.assigneeGid !== void 0) {
      taskData.assignee = updates.assigneeGid === "null" ? null : updates.assigneeGid;
    }
    if (updates.dueDate !== void 0) {
      taskData.due_on = updates.dueDate === "null" ? null : updates.dueDate;
    }
    if (updates.description !== void 0) taskData.notes = updates.description;
    return this.request(
      "PUT",
      `/tasks/${taskGid}?opt_fields=${TASK_DETAIL_FIELDS}`,
      { data: taskData }
    );
  }
  /**
   * Add a comment (story) to a task
   */
  async addComment(taskGid, text) {
    return this.request(
      "POST",
      `/tasks/${taskGid}/stories`,
      { data: { text } }
    );
  }
  /**
   * List projects in a workspace
   */
  async listProjects(options) {
    const workspace = this.resolveWorkspace(options.workspaceGid);
    const params = new URLSearchParams();
    params.set("opt_fields", PROJECT_LIST_FIELDS);
    params.set("archived", "false");
    if (options.limit) {
      params.set("limit", String(options.limit));
    }
    return this.request(
      "GET",
      `/workspaces/${workspace}/projects?${params.toString()}`
    );
  }
  /**
   * List tasks in a project (works on free tier, unlike searchTasks)
   */
  async listProjectTasks(options) {
    const params = new URLSearchParams();
    params.set("opt_fields", TASK_LIST_FIELDS);
    if (options.completedSince) {
      params.set("completed_since", options.completedSince);
    }
    return this.request(
      "GET",
      `/projects/${options.projectGid}/tasks?${params.toString()}`
    );
  }
  /**
   * List sections in a project (works on free tier)
   */
  async listProjectSections(projectGid) {
    const params = new URLSearchParams();
    params.set("opt_fields", SECTION_LIST_FIELDS);
    return this.request(
      "GET",
      `/projects/${projectGid}/sections?${params.toString()}`
    );
  }
};

// src/schemas.ts
var import_zod = require("zod");
var SearchTasksSchema = import_zod.z.object({
  query: import_zod.z.string().describe("Text to search for in task names and descriptions"),
  workspace_gid: import_zod.z.string().optional().describe("Workspace GID (overrides ASANA_WORKSPACE_GID env var)"),
  assignee: import_zod.z.string().optional().describe("Filter by assignee GID (use 'me' for current user)"),
  project_gid: import_zod.z.string().optional().describe("Filter by project GID"),
  completed: import_zod.z.boolean().optional().describe("Filter by completion status (default: false = incomplete only)"),
  limit: import_zod.z.number().int().min(1).max(100).optional().default(25).describe("Maximum results to return (default: 25, max: 100)")
});
var GetTaskSchema = import_zod.z.object({
  task_gid: import_zod.z.string().describe("The globally unique identifier for the task")
});
var CreateTaskSchema = import_zod.z.object({
  name: import_zod.z.string().describe("Name of the task"),
  project_gid: import_zod.z.string().describe("Project GID to add the task to"),
  description: import_zod.z.string().optional().describe("Task description (plain text)"),
  assignee_gid: import_zod.z.string().optional().describe("GID of the user to assign the task to"),
  due_date: import_zod.z.string().optional().describe("Due date in YYYY-MM-DD format"),
  workspace_gid: import_zod.z.string().optional().describe("Workspace GID (overrides ASANA_WORKSPACE_GID env var)")
});
var UpdateTaskSchema = import_zod.z.object({
  task_gid: import_zod.z.string().describe("The globally unique identifier for the task to update"),
  name: import_zod.z.string().optional().describe("New name for the task"),
  completed: import_zod.z.boolean().optional().describe("Mark task as completed (true) or incomplete (false)"),
  assignee_gid: import_zod.z.string().optional().describe("GID of the user to assign the task to (use 'null' to unassign)"),
  due_date: import_zod.z.string().optional().describe("Due date in YYYY-MM-DD format (use 'null' to clear)"),
  description: import_zod.z.string().optional().describe("New description for the task (plain text)")
});
var AddCommentSchema = import_zod.z.object({
  task_gid: import_zod.z.string().describe("The globally unique identifier for the task"),
  text: import_zod.z.string().describe("Comment text to add to the task")
});
var ListProjectsSchema = import_zod.z.object({
  workspace_gid: import_zod.z.string().optional().describe("Workspace GID (overrides ASANA_WORKSPACE_GID env var)"),
  limit: import_zod.z.number().int().min(1).max(100).optional().default(100).describe("Maximum number of projects to return (default: 100)")
});
var ListProjectTasksSchema = import_zod.z.object({
  project_gid: import_zod.z.string().describe("Project GID to list tasks from"),
  completed_since: import_zod.z.string().optional().describe(
    'Only return tasks completed after this date (ISO 8601) or "now" for incomplete only'
  )
});
var ListProjectSectionsSchema = import_zod.z.object({
  project_gid: import_zod.z.string().describe("Project GID to list sections from")
});

// src/tool-handlers.ts
var ToolHandlers = class {
  client;
  constructor(client) {
    this.client = client;
  }
  async searchTasks(args) {
    try {
      const input = SearchTasksSchema.parse(args);
      const result = await this.client.searchTasks({
        query: input.query,
        workspaceGid: input.workspace_gid,
        assignee: input.assignee,
        projectGid: input.project_gid,
        completed: input.completed,
        limit: input.limit
      });
      logger.log(
        "[handler]",
        `searchTasks: ${result.data.length} tasks found`
      );
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("searchTasks", error);
    }
  }
  async getTask(args) {
    try {
      const input = GetTaskSchema.parse(args);
      const result = await this.client.getTask(input.task_gid);
      logger.log("[handler]", `getTask: retrieved ${result.data.gid}`);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("getTask", error);
    }
  }
  async createTask(args) {
    try {
      const input = CreateTaskSchema.parse(args);
      const result = await this.client.createTask({
        name: input.name,
        projectGid: input.project_gid,
        description: input.description,
        assigneeGid: input.assignee_gid,
        dueDate: input.due_date,
        workspaceGid: input.workspace_gid
      });
      logger.log("[handler]", `createTask: created ${result.data.gid}`);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("createTask", error);
    }
  }
  async updateTask(args) {
    try {
      const input = UpdateTaskSchema.parse(args);
      const result = await this.client.updateTask(input.task_gid, {
        name: input.name,
        completed: input.completed,
        assigneeGid: input.assignee_gid,
        dueDate: input.due_date,
        description: input.description
      });
      logger.log("[handler]", `updateTask: updated ${result.data.gid}`);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("updateTask", error);
    }
  }
  async addComment(args) {
    try {
      const input = AddCommentSchema.parse(args);
      const result = await this.client.addComment(
        input.task_gid,
        input.text
      );
      logger.log("[handler]", `addComment: added to ${input.task_gid}`);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("addComment", error);
    }
  }
  async listProjects(args) {
    try {
      const input = ListProjectsSchema.parse(args);
      const result = await this.client.listProjects({
        workspaceGid: input.workspace_gid,
        limit: input.limit
      });
      logger.log(
        "[handler]",
        `listProjects: ${result.data.length} projects found`
      );
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("listProjects", error);
    }
  }
  async listProjectTasks(args) {
    try {
      const input = ListProjectTasksSchema.parse(args);
      const result = await this.client.listProjectTasks({
        projectGid: input.project_gid,
        completedSince: input.completed_since
      });
      logger.log(
        "[handler]",
        `listProjectTasks: ${result.data.length} tasks found`
      );
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("listProjectTasks", error);
    }
  }
  async listProjectSections(args) {
    try {
      const input = ListProjectSectionsSchema.parse(args);
      const result = await this.client.listProjectSections(input.project_gid);
      logger.log(
        "[handler]",
        `listProjectSections: ${result.data.length} sections found`
      );
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("listProjectSections", error);
    }
  }
  handleError(operation, error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("[handler]", `${operation} error: ${message}`);
    return { success: false, error: message };
  }
};

// src/commands/task.ts
var import_commander = require("commander");

// src/formatters.ts
function formatTaskList(tasks) {
  if (tasks.length === 0) {
    return "No tasks found.";
  }
  const lines = tasks.map((task) => {
    const status = task.completed ? "[x]" : "[ ]";
    const assignee = task.assignee?.name || "Unassigned";
    const due = task.due_on || "No due date";
    const project = task.projects && task.projects.length > 0 ? task.projects[0].name : "No project";
    return `${status} ${task.gid} | ${task.name} | ${assignee} | ${due} | ${project}`;
  });
  return `Found ${tasks.length} task(s):
${lines.join("\n")}`;
}
function formatTaskDetail(task) {
  const lines = [];
  const status = task.completed ? "Completed" : "Open";
  lines.push(`Task: ${task.name}`);
  lines.push(`GID: ${task.gid}`);
  lines.push(`Status: ${status}`);
  lines.push(`Assignee: ${task.assignee?.name || "Unassigned"}`);
  lines.push(`Due: ${task.due_on || "No due date"}`);
  if (task.projects && task.projects.length > 0) {
    lines.push(
      `Projects: ${task.projects.map((p) => `${p.name} (${p.gid})`).join(", ")}`
    );
  }
  if (task.memberships && task.memberships.length > 0) {
    const sections = task.memberships.filter((m) => m.section).map((m) => `${m.project.name} > ${m.section.name}`);
    if (sections.length > 0) {
      lines.push(`Sections: ${sections.join(", ")}`);
    }
  }
  if (task.tags && task.tags.length > 0) {
    lines.push(`Tags: ${task.tags.map((t) => t.name).join(", ")}`);
  }
  if (task.parent) {
    lines.push(`Parent: ${task.parent.name} (${task.parent.gid})`);
  }
  if (task.num_subtasks && task.num_subtasks > 0) {
    lines.push(`Subtasks: ${task.num_subtasks}`);
  }
  if (task.permalink_url) {
    lines.push(`URL: ${task.permalink_url}`);
  }
  if (task.created_at) {
    lines.push(`Created: ${task.created_at}`);
  }
  if (task.modified_at) {
    lines.push(`Modified: ${task.modified_at}`);
  }
  if (task.notes) {
    const truncatedNotes = task.notes.length > 500 ? task.notes.substring(0, 500) + "..." : task.notes;
    lines.push(`
Description:
${truncatedNotes}`);
  }
  if (task.custom_fields && task.custom_fields.length > 0) {
    const fields = task.custom_fields.filter((f) => f.display_value).map((f) => `  ${f.name}: ${f.display_value}`);
    if (fields.length > 0) {
      lines.push(`
Custom Fields:
${fields.join("\n")}`);
    }
  }
  return lines.join("\n");
}
function formatProjectList(projects) {
  if (projects.length === 0) {
    return "No projects found.";
  }
  const lines = projects.map((project) => {
    const owner = project.owner?.name || "No owner";
    return `${project.gid} | ${project.name} | ${owner}`;
  });
  return `Found ${projects.length} project(s):
${lines.join("\n")}`;
}
function formatComment(story) {
  return `Comment added (GID: ${story.gid}) at ${story.created_at}`;
}
function formatSectionList(sections) {
  if (sections.length === 0) {
    return "No sections found.";
  }
  const lines = sections.map((section) => {
    return `${section.gid} | ${section.name}`;
  });
  return `Found ${sections.length} section(s):
${lines.join("\n")}`;
}
function formatTaskResult(task, action) {
  return `Task ${action}: ${task.name} (GID: ${task.gid})${task.permalink_url ? `
URL: ${task.permalink_url}` : ""}`;
}

// src/commands/task.ts
function createTaskCommand(handlers) {
  const task = new import_commander.Command("task").description("Manage Asana tasks");
  task.command("list").description("List tasks in a project (works on all Asana tiers)").requiredOption("-p, --project-gid <gid>", "Project GID").option(
    "--completed-since <date>",
    'Only tasks completed after this date (ISO 8601) or "now" for incomplete only'
  ).option("--json", "Output raw JSON").action(async (opts) => {
    const result = await handlers.listProjectTasks({
      project_gid: opts.projectGid,
      completed_since: opts.completedSince
    });
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatTaskList(result.data.data));
    }
  });
  task.command("search").description("Search for tasks in the workspace").requiredOption("-q, --query <text>", "Text to search for").option("-p, --project <gid>", "Filter by project GID").option("-a, --assignee <gid>", "Filter by assignee GID").option("--completed", "Include completed tasks").option("-l, --limit <n>", "Maximum results (default: 25)", "25").option("-w, --workspace <gid>", "Workspace GID override").option("--json", "Output raw JSON").action(async (opts) => {
    const result = await handlers.searchTasks({
      query: opts.query,
      project_gid: opts.project,
      assignee: opts.assignee,
      completed: opts.completed ? true : void 0,
      limit: parseInt(opts.limit, 10),
      workspace_gid: opts.workspace
    });
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatTaskList(result.data.data));
    }
  });
  task.command("get").description("Get detailed information about a task").argument("<gid>", "Task GID").option("--json", "Output raw JSON").action(async (gid, opts) => {
    const result = await handlers.getTask({ task_gid: gid });
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatTaskDetail(result.data.data));
    }
  });
  task.command("create").description("Create a new task").requiredOption("-n, --name <name>", "Task name").requiredOption("-p, --project <gid>", "Project GID").option("-d, --description <text>", "Task description").option("-a, --assignee <gid>", "Assignee GID").option("--due <date>", "Due date (YYYY-MM-DD)").option("-w, --workspace <gid>", "Workspace GID override").option("--json", "Output raw JSON").action(async (opts) => {
    const result = await handlers.createTask({
      name: opts.name,
      project_gid: opts.project,
      description: opts.description,
      assignee_gid: opts.assignee,
      due_date: opts.due,
      workspace_gid: opts.workspace
    });
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatTaskResult(result.data.data, "created"));
    }
  });
  task.command("update").description("Update an existing task").argument("<gid>", "Task GID").option("-n, --name <name>", "New task name").option("--completed", "Mark as completed").option("--incomplete", "Mark as incomplete").option("-a, --assignee <gid>", "Assignee GID (use 'null' to unassign)").option("--due <date>", "Due date YYYY-MM-DD (use 'null' to clear)").option("-d, --description <text>", "New description").option("--json", "Output raw JSON").action(async (gid, opts) => {
    const updates = { task_gid: gid };
    if (opts.name) updates.name = opts.name;
    if (opts.completed) updates.completed = true;
    if (opts.incomplete) updates.completed = false;
    if (opts.assignee) updates.assignee_gid = opts.assignee;
    if (opts.due) updates.due_date = opts.due;
    if (opts.description) updates.description = opts.description;
    const result = await handlers.updateTask(updates);
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatTaskResult(result.data.data, "updated"));
    }
  });
  task.command("comment").description("Add a comment to a task").argument("<gid>", "Task GID").requiredOption("-b, --body <text>", "Comment text").option("--json", "Output raw JSON").action(async (gid, opts) => {
    const result = await handlers.addComment({
      task_gid: gid,
      text: opts.body
    });
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatComment(result.data.data));
    }
  });
  return task;
}

// src/commands/project.ts
var import_commander2 = require("commander");
function createProjectCommand(handlers) {
  const project = new import_commander2.Command("project").description("Manage Asana projects");
  project.command("list").description("List projects in the workspace").option("-l, --limit <n>", "Maximum results (default: 100)", "100").option("-w, --workspace <gid>", "Workspace GID override").option("--json", "Output raw JSON").action(async (opts) => {
    const result = await handlers.listProjects({
      limit: parseInt(opts.limit, 10),
      workspace_gid: opts.workspace
    });
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatProjectList(result.data.data));
    }
  });
  return project;
}

// src/commands/section.ts
var import_commander3 = require("commander");
function createSectionCommand(handlers) {
  const section = new import_commander3.Command("section").description(
    "Manage Asana project sections"
  );
  section.command("list").description("List sections in a project").requiredOption("-p, --project-gid <gid>", "Project GID").option("--json", "Output raw JSON").action(async (opts) => {
    const result = await handlers.listProjectSections({
      project_gid: opts.projectGid
    });
    if (!result.success) {
      console.error(result.error);
      process.exit(1);
    }
    if (opts.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(formatSectionList(result.data.data));
    }
  });
  return section;
}

// src/cli.ts
var _handlers;
function getHandlers() {
  if (!_handlers) {
    const client = new AsanaClient();
    _handlers = new ToolHandlers(client);
  }
  return _handlers;
}
var lazyHandlers = new Proxy({}, {
  get(_target, prop) {
    const handlers = getHandlers();
    const value = handlers[prop];
    if (typeof value === "function") {
      return value.bind(handlers);
    }
    return value;
  }
});
async function main() {
  const program = new import_commander4.Command().name("asana-cli").description("Asana CLI for task and project management").version("0.1.0");
  program.addCommand(createTaskCommand(lazyHandlers));
  program.addCommand(createProjectCommand(lazyHandlers));
  program.addCommand(createSectionCommand(lazyHandlers));
  await program.parseAsync(process.argv);
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
