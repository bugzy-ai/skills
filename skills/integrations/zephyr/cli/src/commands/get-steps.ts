import { request } from '../client';
import type { ZephyrTestStep, ZephyrTestStepsResponse } from '../types';

interface GetStepsArgs {
  key: string;
}

export async function getSteps(args: GetStepsArgs): Promise<void> {
  if (!args.key) throw new Error('--key is required');

  const allSteps: ZephyrTestStep[] = [];
  let startAt = 0;
  const maxResults = 100;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await request<ZephyrTestStepsResponse>(
      'GET',
      `/testcases/${args.key}/teststeps`,
      undefined,
      { startAt, maxResults }
    );
    allSteps.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }

  process.stdout.write(JSON.stringify(allSteps, null, 2));
}
