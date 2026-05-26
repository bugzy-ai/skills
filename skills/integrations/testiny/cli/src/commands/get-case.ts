import { request } from '../client';
import type { TestinyTestCase } from '../types';

interface GetCaseArgs {
  id: string;
}

export async function getCase(args: GetCaseArgs): Promise<void> {
  if (!args.id) throw new Error('--id is required');
  const id = parseInt(args.id, 10);
  if (isNaN(id)) throw new Error(`--id must be numeric, got: "${args.id}"`);

  const result = await request<TestinyTestCase>('GET', `/testcase/${id}`);
  process.stdout.write(JSON.stringify(result, null, 2));
}
