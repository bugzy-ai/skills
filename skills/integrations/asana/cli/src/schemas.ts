import { z } from "zod";

/**
 * Schema for task search command
 */
export const SearchTasksSchema = z.object({
  query: z
    .string()
    .describe("Text to search for in task names and descriptions"),
  workspace_gid: z
    .string()
    .optional()
    .describe("Workspace GID (overrides ASANA_WORKSPACE_GID env var)"),
  assignee: z
    .string()
    .optional()
    .describe("Filter by assignee GID (use 'me' for current user)"),
  project_gid: z
    .string()
    .optional()
    .describe("Filter by project GID"),
  completed: z
    .boolean()
    .optional()
    .describe("Filter by completion status (default: false = incomplete only)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25)
    .describe("Maximum results to return (default: 25, max: 100)"),
});

/**
 * Schema for task get command
 */
export const GetTaskSchema = z.object({
  task_gid: z
    .string()
    .describe("The globally unique identifier for the task"),
});

/**
 * Schema for task create command
 */
export const CreateTaskSchema = z.object({
  name: z
    .string()
    .describe("Name of the task"),
  project_gid: z
    .string()
    .describe("Project GID to add the task to"),
  description: z
    .string()
    .optional()
    .describe("Task description (plain text)"),
  assignee_gid: z
    .string()
    .optional()
    .describe("GID of the user to assign the task to"),
  due_date: z
    .string()
    .optional()
    .describe("Due date in YYYY-MM-DD format"),
  workspace_gid: z
    .string()
    .optional()
    .describe("Workspace GID (overrides ASANA_WORKSPACE_GID env var)"),
});

/**
 * Schema for task update command
 */
export const UpdateTaskSchema = z.object({
  task_gid: z
    .string()
    .describe("The globally unique identifier for the task to update"),
  name: z
    .string()
    .optional()
    .describe("New name for the task"),
  completed: z
    .boolean()
    .optional()
    .describe("Mark task as completed (true) or incomplete (false)"),
  assignee_gid: z
    .string()
    .optional()
    .describe("GID of the user to assign the task to (use 'null' to unassign)"),
  due_date: z
    .string()
    .optional()
    .describe("Due date in YYYY-MM-DD format (use 'null' to clear)"),
  description: z
    .string()
    .optional()
    .describe("New description for the task (plain text)"),
});

/**
 * Schema for task comment command
 */
export const AddCommentSchema = z.object({
  task_gid: z
    .string()
    .describe("The globally unique identifier for the task"),
  text: z
    .string()
    .describe("Comment text to add to the task"),
});

/**
 * Schema for project list command
 */
export const ListProjectsSchema = z.object({
  workspace_gid: z
    .string()
    .optional()
    .describe("Workspace GID (overrides ASANA_WORKSPACE_GID env var)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(100)
    .describe("Maximum number of projects to return (default: 100)"),
});

/**
 * Schema for task list command (free-tier alternative to search)
 */
export const ListProjectTasksSchema = z.object({
  project_gid: z
    .string()
    .describe("Project GID to list tasks from"),
  completed_since: z
    .string()
    .optional()
    .describe(
      'Only return tasks completed after this date (ISO 8601) or "now" for incomplete only'
    ),
});

/**
 * Schema for section list command
 */
export const ListProjectSectionsSchema = z.object({
  project_gid: z
    .string()
    .describe("Project GID to list sections from"),
});

// Export inferred types
export type SearchTasksInput = z.infer<typeof SearchTasksSchema>;
export type GetTaskInput = z.infer<typeof GetTaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type AddCommentInput = z.infer<typeof AddCommentSchema>;
export type ListProjectsInput = z.infer<typeof ListProjectsSchema>;
export type ListProjectTasksInput = z.infer<typeof ListProjectTasksSchema>;
export type ListProjectSectionsInput = z.infer<typeof ListProjectSectionsSchema>;
