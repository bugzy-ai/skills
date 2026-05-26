import { request } from '../client';
import type { TestinyTestPlan } from '../types';

interface GetPlanArgs {
  id: string;
}

export async function getPlan(args: GetPlanArgs): Promise<void> {
  if (!args.id) throw new Error('--id is required');
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);

  const result = await request<TestinyTestPlan>('GET', `/testplan/${id}`);
  process.stdout.write(JSON.stringify(result, null, 2));
}
