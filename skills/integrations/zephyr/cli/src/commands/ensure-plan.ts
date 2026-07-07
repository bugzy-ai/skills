import { request } from '../client';
import type { ZephyrCreatedResource, ZephyrListResponse, ZephyrTestPlan } from '../types';

interface EnsurePlanArgs {
  project: string;
  release?: string;
  name?: string;
  folder?: string;
  status?: string;
}

function planName(args: EnsurePlanArgs): string {
  if (args.name) return args.name;
  if (args.release) return `${args.release} Release Test Plan`;
  throw new Error('--name or --release is required');
}

function parseNumericId(flag: string, value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${flag} must be a positive numeric ID`);
  return id;
}

async function listAllPlans(project: string): Promise<ZephyrTestPlan[]> {
  const plans: ZephyrTestPlan[] = [];
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const result = await request<ZephyrListResponse<ZephyrTestPlan>>(
      'GET',
      '/testplans',
      undefined,
      { projectKey: project, maxResults, startAt }
    );
    plans.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }

  return plans;
}

export async function ensurePlan(args: EnsurePlanArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');
  const name = planName(args);
  const folderId = args.folder ? parseNumericId('--folder', args.folder) : undefined;

  const existing = (await listAllPlans(args.project)).find((plan) => plan.name === name);
  if (existing) {
    process.stdout.write(JSON.stringify({ created: false, plan: existing }, null, 2));
    return;
  }

  const body: Record<string, unknown> = {
    projectKey: args.project,
    name,
  };
  if (args.release) body.labels = [`release:${args.release}`];
  if (folderId) body.folderId = folderId;
  if (args.status) body.statusName = args.status;

  const plan = await request<ZephyrCreatedResource>('POST', '/testplans', body);
  process.stdout.write(JSON.stringify({ created: true, plan }, null, 2));
}
