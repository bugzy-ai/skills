import { createWorkItem, buildJsonPatch, getBaseUrl } from '../api-client';
import type { JsonPatchOperation } from '../types';

export interface CreateOptions {
  project: string;
  type: string;
  title: string;
  description?: string;
  areaPath?: string;
  iterationPath?: string;
  assignedTo?: string;
  priority?: string;
  severity?: string;
  tags?: string;
  parentId?: string;
}

export async function createCommand(options: CreateOptions): Promise<void> {
  if (!options.project) {
    throw new Error('--project is required for work-item create');
  }
  if (!options.type) {
    throw new Error('--type is required for work-item create');
  }
  if (!options.title) {
    throw new Error('--title is required for work-item create');
  }

  const fields: Record<string, unknown> = {
    title: options.title,
  };
  if (options.description) fields.description = options.description;
  if (options.areaPath) fields['area-path'] = options.areaPath;
  if (options.iterationPath) fields['iteration-path'] = options.iterationPath;
  if (options.assignedTo) fields['assigned-to'] = options.assignedTo;
  if (options.priority) fields.priority = parseInt(options.priority, 10);
  if (options.severity) fields.severity = options.severity;
  if (options.tags) fields.tags = options.tags;

  const operations: JsonPatchOperation[] = buildJsonPatch(fields);

  // Add parent link if specified
  if (options.parentId) {
    const baseUrl = getBaseUrl();
    operations.push({
      op: 'add',
      path: '/relations/-',
      value: {
        rel: 'System.LinkTypes.Hierarchy-Reverse',
        url: `${baseUrl}/_apis/wit/workitems/${options.parentId}`,
        attributes: { comment: 'Parent link' },
      },
    });
  }

  const workItem = await createWorkItem(options.type, operations, options.project);
  console.log(JSON.stringify(workItem, null, 2));
}
