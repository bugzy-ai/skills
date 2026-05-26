import { request } from '../client';
import type { TestinyTestPlan } from '../types';

interface UpdatePlanArgs {
  id: string;
  name?: string;
  description?: string;
}

export async function updatePlan(args: UpdatePlanArgs): Promise<void> {
  if (!args.id) throw new Error('--id is required');
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);

  const body: Record<string, unknown> = {};
  if (args.name !== undefined) body.title = args.name;
  if (args.description !== undefined) body.description = args.description;

  const result = await request<TestinyTestPlan>('PUT', `/testplan/${id}`, body);
  process.stdout.write(JSON.stringify(result, null, 2));
}
