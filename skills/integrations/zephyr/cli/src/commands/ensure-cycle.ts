import { request } from '../client';
import type { ZephyrCreatedResource, ZephyrListResponse, ZephyrTestCycle } from '../types';

interface EnsureCycleArgs {
  project: string;
  name: string;
  jiraProjectVersionId: string;
  plannedStartDate: string;
  plannedEndDate: string;
  description?: string;
  folder?: string;
  status?: string;
}

function parseNumericId(flag: string, value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${flag} must be a positive numeric ID`);
  return id;
}

async function listAllCycles(project: string, jiraProjectVersionId: number): Promise<ZephyrTestCycle[]> {
  const cycles: ZephyrTestCycle[] = [];
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const result = await request<ZephyrListResponse<ZephyrTestCycle>>(
      'GET',
      '/testcycles',
      undefined,
      { projectKey: project, jiraProjectVersionId, maxResults, startAt }
    );
    cycles.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }

  return cycles;
}

export async function ensureCycle(args: EnsureCycleArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');
  if (!args.name) throw new Error('--name is required');
  if (!args.jiraProjectVersionId) throw new Error('--jira-project-version-id is required');
  if (!args.plannedStartDate) throw new Error('--planned-start-date is required');
  if (!args.plannedEndDate) throw new Error('--planned-end-date is required');

  const jiraProjectVersionId = parseNumericId('--jira-project-version-id', args.jiraProjectVersionId);
  const existing = (await listAllCycles(args.project, jiraProjectVersionId)).find(
    (cycle) => cycle.name === args.name
  );
  if (existing) {
    process.stdout.write(JSON.stringify({ created: false, cycle: existing }, null, 2));
    return;
  }

  const body: Record<string, unknown> = {
    projectKey: args.project,
    name: args.name,
    jiraProjectVersionId,
    plannedStartDate: args.plannedStartDate,
    plannedEndDate: args.plannedEndDate,
  };
  if (args.description) body.description = args.description;
  if (args.folder) body.folderId = parseNumericId('--folder', args.folder);
  if (args.status) body.statusName = args.status;

  const cycle = await request<ZephyrCreatedResource>('POST', '/testcycles', body);
  process.stdout.write(JSON.stringify({ created: true, cycle }, null, 2));
}
