import { request } from '../client';
import type { ZephyrTestCase, ZephyrRef, ZephyrListResponse } from '../types';

interface UpdateCaseArgs {
  key: string;
  name?: string;
  objective?: string;
  precondition?: string;
  labels?: string; // comma-separated
  priority?: string;
  status?: string;
  folder?: string; // folder ID
}

/**
 * Resolve a priority name (e.g. "High") to its ref by listing all priorities.
 */
async function resolvePriorityRef(name: string): Promise<ZephyrRef> {
  const result = await request<ZephyrListResponse<ZephyrRef & { name: string }>>(
    'GET', '/priorities'
  );
  const match = result.values.find(
    (p) => p.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) throw new Error(`Unknown priority: "${name}"`);
  return { id: match.id };
}

/**
 * Resolve a status name (e.g. "Draft") to its ref.
 * Filters to TEST_CASE type.
 */
async function resolveStatusRef(name: string, projectId: number): Promise<ZephyrRef> {
  const result = await request<ZephyrListResponse<ZephyrRef & { name: string }>>(
    'GET', '/statuses', undefined, { statusType: 'TEST_CASE', projectId }
  );
  const match = result.values.find(
    (s) => s.name.toLowerCase() === name.toLowerCase()
  );
  if (!match) throw new Error(`Unknown status: "${name}"`);
  return { id: match.id };
}

export async function updateCase(args: UpdateCaseArgs): Promise<void> {
  if (!args.key) throw new Error('--key is required');

  // Fetch existing case — Zephyr PUT requires all fields as object refs
  const existing = await request<ZephyrTestCase>('GET', `/testcases/${args.key}`);

  // PUT uses a different contract than POST:
  //   PUT requires id, key, project:{id}, priority:{id}, status:{id}, folder:{id}
  //   POST uses flat fields: projectKey, priorityName, statusName, folderId
  const body: Record<string, unknown> = {
    id: existing.id,
    key: existing.key,
    project: { id: existing.project.id },
    name: args.name ?? existing.name,
    objective: args.objective ?? existing.objective,
    precondition: args.precondition ?? existing.precondition,
    priority: existing.priority,
    status: existing.status,
    folder: existing.folder,
  };

  // Override folder if provided
  if (args.folder) {
    const folderId = parseInt(args.folder, 10);
    if (isNaN(folderId)) throw new Error(`--folder must be a numeric ID, got: "${args.folder}"`);
    body.folder = { id: folderId };
  }

  // Resolve name→ID if user wants to change priority or status
  if (args.priority) {
    body.priority = await resolvePriorityRef(args.priority);
  }

  if (args.status) {
    body.status = await resolveStatusRef(args.status, existing.project.id);
  }

  if (args.labels) body.labels = args.labels.split(',').map((l) => l.trim());

  const result = await request<ZephyrTestCase>('PUT', `/testcases/${args.key}`, body);
  process.stdout.write(JSON.stringify(result, null, 2));
}
