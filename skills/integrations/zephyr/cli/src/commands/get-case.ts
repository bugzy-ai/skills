import { request } from '../client';
import type { ZephyrTestCase } from '../types';

interface GetCaseArgs {
  key: string;
}

export async function getCase(args: GetCaseArgs): Promise<void> {
  if (!args.key) throw new Error('--key is required');

  const result = await request<ZephyrTestCase>('GET', `/testcases/${args.key}`);
  process.stdout.write(JSON.stringify(result, null, 2));
}
