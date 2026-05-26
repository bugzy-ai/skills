import { request } from '../client';
import type { ZephyrTestCase, ZephyrListResponse } from '../types';

interface ListCasesArgs {
  project: string;
  folder?: string;
  maxResults?: string;
  startAt?: string;
}

export async function listCases(args: ListCasesArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');

  // If explicit pagination params provided, use them (backward compatibility)
  if (args.maxResults || args.startAt) {
    const params: Record<string, string | number | undefined> = {
      projectKey: args.project,
      folderId: args.folder,
      maxResults: args.maxResults ?? '50',
      startAt: args.startAt ?? '0',
    };

    const result = await request<ZephyrListResponse<ZephyrTestCase>>(
      'GET',
      '/testcases',
      undefined,
      params
    );
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  // Otherwise, fetch all pages for complete idempotency
  const allCases: ZephyrTestCase[] = [];
  let startAt = 0;
  let apiTotal = 0;
  const maxResults = 100;

  while (true) {
    const result = await request<ZephyrListResponse<ZephyrTestCase>>(
      'GET',
      '/testcases',
      undefined,
      {
        projectKey: args.project,
        folderId: args.folder,
        maxResults,
        startAt,
      }
    );
    allCases.push(...result.values);
    apiTotal = result.total;
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }

  process.stdout.write(JSON.stringify({ values: allCases, total: apiTotal }, null, 2));
}
