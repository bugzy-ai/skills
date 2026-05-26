import { AsanaClient } from "./asana-client";
import {
  SearchTasksSchema,
  GetTaskSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  AddCommentSchema,
  ListProjectsSchema,
  ListProjectTasksSchema,
  ListProjectSectionsSchema,
} from "./schemas";
import type {
  AsanaTask,
  AsanaProject,
  AsanaSection,
  AsanaStory,
  AsanaPagedResponse,
  AsanaSingleResponse,
} from "./types";
import { logger } from "./logger";

export interface HandlerResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tool handlers for CLI commands.
 * Validates input with Zod, calls the client, and returns structured results.
 */
export class ToolHandlers {
  private client: AsanaClient;

  constructor(client: AsanaClient) {
    this.client = client;
  }

  async searchTasks(
    args: unknown
  ): Promise<HandlerResult<AsanaPagedResponse<AsanaTask>>> {
    try {
      const input = SearchTasksSchema.parse(args);
      const result = await this.client.searchTasks({
        query: input.query,
        workspaceGid: input.workspace_gid,
        assignee: input.assignee,
        projectGid: input.project_gid,
        completed: input.completed,
        limit: input.limit,
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

  async getTask(
    args: unknown
  ): Promise<HandlerResult<AsanaSingleResponse<AsanaTask>>> {
    try {
      const input = GetTaskSchema.parse(args);
      const result = await this.client.getTask(input.task_gid);
      logger.log("[handler]", `getTask: retrieved ${result.data.gid}`);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("getTask", error);
    }
  }

  async createTask(
    args: unknown
  ): Promise<HandlerResult<AsanaSingleResponse<AsanaTask>>> {
    try {
      const input = CreateTaskSchema.parse(args);
      const result = await this.client.createTask({
        name: input.name,
        projectGid: input.project_gid,
        description: input.description,
        assigneeGid: input.assignee_gid,
        dueDate: input.due_date,
        workspaceGid: input.workspace_gid,
      });
      logger.log("[handler]", `createTask: created ${result.data.gid}`);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("createTask", error);
    }
  }

  async updateTask(
    args: unknown
  ): Promise<HandlerResult<AsanaSingleResponse<AsanaTask>>> {
    try {
      const input = UpdateTaskSchema.parse(args);
      const result = await this.client.updateTask(input.task_gid, {
        name: input.name,
        completed: input.completed,
        assigneeGid: input.assignee_gid,
        dueDate: input.due_date,
        description: input.description,
      });
      logger.log("[handler]", `updateTask: updated ${result.data.gid}`);
      return { success: true, data: result };
    } catch (error) {
      return this.handleError("updateTask", error);
    }
  }

  async addComment(
    args: unknown
  ): Promise<HandlerResult<AsanaSingleResponse<AsanaStory>>> {
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

  async listProjects(
    args: unknown
  ): Promise<HandlerResult<AsanaPagedResponse<AsanaProject>>> {
    try {
      const input = ListProjectsSchema.parse(args);
      const result = await this.client.listProjects({
        workspaceGid: input.workspace_gid,
        limit: input.limit,
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

  async listProjectTasks(
    args: unknown
  ): Promise<HandlerResult<AsanaPagedResponse<AsanaTask>>> {
    try {
      const input = ListProjectTasksSchema.parse(args);
      const result = await this.client.listProjectTasks({
        projectGid: input.project_gid,
        completedSince: input.completed_since,
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

  async listProjectSections(
    args: unknown
  ): Promise<HandlerResult<AsanaPagedResponse<AsanaSection>>> {
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

  private handleError(operation: string, error: unknown): HandlerResult<never> {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    logger.error("[handler]", `${operation} error: ${message}`);
    return { success: false, error: message };
  }
}
