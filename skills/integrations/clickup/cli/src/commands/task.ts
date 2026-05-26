/**
 * Task commands for ClickUp CLI
 * Handles search, get, create, update, and comment operations
 */

import { request, getTeamId } from '../clickup-client';
import type { ClickUpTask, ClickUpTaskResponse, ClickUpComment } from '../types';

export interface SearchOptions {
  query?: string;
  list?: string;
  space?: string;
  status?: string;
  assignee?: string;
  limit?: string;
  page?: string;
}

/**
 * Search tasks across the workspace
 */
export async function searchTasks(options: SearchOptions): Promise<void> {
  const teamId = getTeamId();
  const params = new URLSearchParams();

  if (options.query) {
    // ClickUp's filtered task endpoint doesn't have a text search param,
    // but the workspace-wide endpoint supports filtering
    // We'll filter client-side by name if needed
  }

  params.set('include_closed', 'true');
  params.set('subtasks', 'true');

  if (options.list) {
    params.set('list_ids[]', options.list);
  }

  if (options.space) {
    params.set('space_ids[]', options.space);
  }

  if (options.status) {
    params.set('statuses[]', options.status);
  }

  if (options.assignee) {
    params.set('assignees[]', options.assignee);
  }

  const page = options.page ? parseInt(options.page, 10) : 0;
  params.set('page', String(page));

  const data = await request<ClickUpTaskResponse>(
    'GET',
    `/team/${teamId}/task?${params.toString()}`
  );

  let tasks = data.tasks;

  // Client-side name filtering when query is provided
  if (options.query) {
    const q = options.query.toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Apply limit
  const limit = options.limit ? parseInt(options.limit, 10) : 100;
  if (tasks.length > limit) {
    tasks = tasks.slice(0, limit);
  }

  console.log(JSON.stringify(tasks));
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<void> {
  if (!taskId) {
    throw new Error('Task ID is required (e.g., abc123 or custom ID)');
  }

  // Try as regular task ID first
  try {
    const task = await request<ClickUpTask>('GET', `/task/${taskId}`);
    console.log(JSON.stringify(task));
    return;
  } catch {
    // If it fails, try as custom task ID
    const teamId = getTeamId();
    const task = await request<ClickUpTask>(
      'GET',
      `/task/${taskId}?custom_task_ids=true&team_id=${teamId}`
    );
    console.log(JSON.stringify(task));
  }
}

export interface CreateOptions {
  list: string;
  name: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
}

/**
 * Create a new task in a list
 */
export async function createTask(options: CreateOptions): Promise<void> {
  if (!options.list) {
    throw new Error('--list is required for task create (list ID)');
  }
  if (!options.name) {
    throw new Error('--name is required for task create');
  }

  const body: Record<string, unknown> = {
    name: options.name,
  };

  if (options.description) {
    body.description = options.description;
  }

  if (options.status) {
    body.status = options.status;
  }

  if (options.priority) {
    // ClickUp priority: 1=Urgent, 2=High, 3=Normal, 4=Low
    body.priority = parseInt(options.priority, 10);
  }

  if (options.assignee) {
    body.assignees = [parseInt(options.assignee, 10)];
  }

  const task = await request<ClickUpTask>(
    'POST',
    `/list/${options.list}/task`,
    body
  );
  console.log(JSON.stringify(task));
}

export interface UpdateOptions {
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
}

/**
 * Update an existing task
 */
export async function updateTask(
  taskId: string,
  options: UpdateOptions
): Promise<void> {
  if (!taskId) {
    throw new Error('Task ID is required for task update');
  }

  const body: Record<string, unknown> = {};

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
    throw new Error('No update options provided');
  }

  const task = await request<ClickUpTask>('PUT', `/task/${taskId}`, body);
  console.log(JSON.stringify(task));
}

/**
 * Add a comment to a task
 */
export async function commentTask(
  taskId: string,
  body: string
): Promise<void> {
  if (!taskId) {
    throw new Error('Task ID is required for task comment');
  }
  if (!body) {
    throw new Error('--body is required for task comment');
  }

  const comment = await request<ClickUpComment>(
    'POST',
    `/task/${taskId}/comment`,
    { comment_text: body }
  );
  console.log(JSON.stringify(comment));
}
