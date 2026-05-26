import type {
  AsanaTask,
  AsanaProject,
  AsanaSection,
  AsanaStory,
  AsanaPagedResponse,
  AsanaSingleResponse,
  AsanaErrorResponse,
} from "./types";
import { logger } from "./logger";

export class AsanaClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public asanaErrors?: AsanaErrorResponse
  ) {
    super(message);
    this.name = "AsanaClientError";
  }
}

const BASE_URL = "https://app.asana.com/api/1.0";
const MAX_RETRIES = 3;

/** Fields to include in task search/list responses */
const TASK_LIST_FIELDS =
  "gid,name,assignee,assignee.name,completed,due_on,permalink_url,projects,projects.name";

/** Fields to include in single task GET responses */
const TASK_DETAIL_FIELDS =
  "gid,name,assignee,assignee.name,assignee.email,completed,completed_at,created_at,modified_at,due_on,due_at,notes,permalink_url,projects,projects.name,tags,tags.name,memberships,memberships.project,memberships.project.name,memberships.section,memberships.section.name,parent,parent.name,num_subtasks,custom_fields,custom_fields.name,custom_fields.display_value";

/** Fields to include in project list responses */
const PROJECT_LIST_FIELDS =
  "gid,name,archived,color,owner,owner.name,created_at,modified_at";

/** Fields to include in section list responses */
const SECTION_LIST_FIELDS = "gid,name";

export class AsanaClient {
  private readonly accessToken: string;
  private readonly defaultWorkspaceGid: string;

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
  private resolveWorkspace(workspaceGid?: string): string {
    return workspaceGid || this.defaultWorkspaceGid;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Make an HTTP request to the Asana API with retry logic for rate limiting
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    attempt: number = 0
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
    };

    const options: RequestInit = { method, headers };

    if (body) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    logger.log("[AsanaClient]", `REQUEST: ${method} ${url}`);
    if (body) {
      logger.log("[AsanaClient]", "REQUEST BODY:", body);
    }

    let response: Response;
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
      responseText.substring(0, 2000)
    );

    // Handle rate limiting (429)
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "5",
        10
      );
      const delayMs = retryAfter * 1000;
      logger.warn(
        "[AsanaClient]",
        `Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await this.delay(delayMs);
      return this.request<T>(method, endpoint, body, attempt + 1);
    }

    if (!response.ok) {
      let errorData: AsanaErrorResponse | undefined;
      let message: string;

      try {
        errorData = JSON.parse(responseText) as AsanaErrorResponse;
        const errorMessages = errorData.errors?.map((e) => e.message) || [];
        message =
          errorMessages.length > 0
            ? errorMessages.join("; ")
            : `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        const snippet = responseText.slice(0, 200).replace(/\s+/g, " ").trim();
        message = snippet
          ? `HTTP ${response.status}: ${snippet}`
          : `HTTP ${response.status}: ${response.statusText}`;
      }

      throw new AsanaClientError(
        message.startsWith("HTTP ") ? message : `HTTP ${response.status}: ${message}`,
        response.status,
        errorData
      );
    }

    if (response.status === 204 || !responseText) {
      return {} as T;
    }

    return JSON.parse(responseText) as T;
  }

  /**
   * Search tasks in a workspace
   */
  async searchTasks(options: {
    query: string;
    workspaceGid?: string;
    assignee?: string;
    projectGid?: string;
    completed?: boolean;
    limit?: number;
  }): Promise<AsanaPagedResponse<AsanaTask>> {
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
    if (options.completed !== undefined) {
      params.set("completed", String(options.completed));
    } else {
      // Default: search incomplete tasks only
      params.set("completed", "false");
    }
    if (options.limit) {
      params.set("limit", String(options.limit));
    }

    return this.request<AsanaPagedResponse<AsanaTask>>(
      "GET",
      `/workspaces/${workspace}/tasks/search?${params.toString()}`
    );
  }

  /**
   * Get a single task by GID
   */
  async getTask(taskGid: string): Promise<AsanaSingleResponse<AsanaTask>> {
    return this.request<AsanaSingleResponse<AsanaTask>>(
      "GET",
      `/tasks/${taskGid}?opt_fields=${TASK_DETAIL_FIELDS}`
    );
  }

  /**
   * Create a new task
   */
  async createTask(options: {
    name: string;
    projectGid: string;
    description?: string;
    assigneeGid?: string;
    dueDate?: string;
    workspaceGid?: string;
  }): Promise<AsanaSingleResponse<AsanaTask>> {
    const workspace = this.resolveWorkspace(options.workspaceGid);

    // Asana requires exactly one of `workspace` or `projects`, not both.
    // When a project is specified, the workspace is inferred from it.
    const taskData: Record<string, unknown> = {
      name: options.name,
      projects: [options.projectGid],
    };

    if (options.description) taskData.notes = options.description;
    if (options.assigneeGid) taskData.assignee = options.assigneeGid;
    if (options.dueDate) taskData.due_on = options.dueDate;

    return this.request<AsanaSingleResponse<AsanaTask>>(
      "POST",
      `/tasks?opt_fields=${TASK_DETAIL_FIELDS}`,
      { data: taskData }
    );
  }

  /**
   * Update an existing task
   */
  async updateTask(
    taskGid: string,
    updates: {
      name?: string;
      completed?: boolean;
      assigneeGid?: string;
      dueDate?: string;
      description?: string;
    }
  ): Promise<AsanaSingleResponse<AsanaTask>> {
    const taskData: Record<string, unknown> = {};

    if (updates.name !== undefined) taskData.name = updates.name;
    if (updates.completed !== undefined) taskData.completed = updates.completed;
    if (updates.assigneeGid !== undefined) {
      taskData.assignee = updates.assigneeGid === "null" ? null : updates.assigneeGid;
    }
    if (updates.dueDate !== undefined) {
      taskData.due_on = updates.dueDate === "null" ? null : updates.dueDate;
    }
    if (updates.description !== undefined) taskData.notes = updates.description;

    return this.request<AsanaSingleResponse<AsanaTask>>(
      "PUT",
      `/tasks/${taskGid}?opt_fields=${TASK_DETAIL_FIELDS}`,
      { data: taskData }
    );
  }

  /**
   * Add a comment (story) to a task
   */
  async addComment(
    taskGid: string,
    text: string
  ): Promise<AsanaSingleResponse<AsanaStory>> {
    return this.request<AsanaSingleResponse<AsanaStory>>(
      "POST",
      `/tasks/${taskGid}/stories`,
      { data: { text } }
    );
  }

  /**
   * List projects in a workspace
   */
  async listProjects(options: {
    workspaceGid?: string;
    limit?: number;
  }): Promise<AsanaPagedResponse<AsanaProject>> {
    const workspace = this.resolveWorkspace(options.workspaceGid);
    const params = new URLSearchParams();

    params.set("opt_fields", PROJECT_LIST_FIELDS);
    params.set("archived", "false");
    if (options.limit) {
      params.set("limit", String(options.limit));
    }

    return this.request<AsanaPagedResponse<AsanaProject>>(
      "GET",
      `/workspaces/${workspace}/projects?${params.toString()}`
    );
  }

  /**
   * List tasks in a project (works on free tier, unlike searchTasks)
   */
  async listProjectTasks(options: {
    projectGid: string;
    completedSince?: string;
  }): Promise<AsanaPagedResponse<AsanaTask>> {
    const params = new URLSearchParams();

    params.set("opt_fields", TASK_LIST_FIELDS);
    if (options.completedSince) {
      params.set("completed_since", options.completedSince);
    }

    return this.request<AsanaPagedResponse<AsanaTask>>(
      "GET",
      `/projects/${options.projectGid}/tasks?${params.toString()}`
    );
  }

  /**
   * List sections in a project (works on free tier)
   */
  async listProjectSections(
    projectGid: string
  ): Promise<AsanaPagedResponse<AsanaSection>> {
    const params = new URLSearchParams();

    params.set("opt_fields", SECTION_LIST_FIELDS);

    return this.request<AsanaPagedResponse<AsanaSection>>(
      "GET",
      `/projects/${projectGid}/sections?${params.toString()}`
    );
  }
}
