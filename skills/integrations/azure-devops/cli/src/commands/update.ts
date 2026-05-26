import { updateWorkItem, buildJsonPatch } from '../api-client';
import type { JsonPatchOperation } from '../types';

export interface UpdateOptions {
  project: string;
  state?: string;
  assignee?: string;
  priority?: string;
  title?: string;
  tags?: string;
  severity?: string;
  operations?: string;
}

export async function updateCommand(id: string, options: UpdateOptions): Promise<void> {
  if (!id) {
    throw new Error('Work item ID is required');
  }
  if (!options.project) {
    throw new Error('--project is required for work-item update');
  }

  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    throw new Error(`Invalid work item ID: ${id}`);
  }

  let ops: JsonPatchOperation[];

  // Raw --operations takes precedence (matches MCP server behavior)
  if (options.operations) {
    ops = JSON.parse(options.operations) as JsonPatchOperation[];
  } else {
    const fields: Record<string, unknown> = {};
    if (options.state) fields.state = options.state;
    if (options.assignee) fields.assignee = options.assignee;
    if (options.priority) fields.priority = parseInt(options.priority, 10);
    if (options.title) fields.title = options.title;
    if (options.tags) fields.tags = options.tags;
    if (options.severity) fields.severity = options.severity;

    ops = buildJsonPatch(fields);
    if (ops.length === 0) {
      throw new Error('At least one field to update is required (--state, --title, --assignee, --priority, --tags, --severity, or --operations)');
    }
  }

  const workItem = await updateWorkItem(numId, ops, options.project);
  console.log(JSON.stringify(workItem, null, 2));
}
