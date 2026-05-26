import { request } from '../client';
import type { ZephyrFolder, ZephyrListResponse } from '../types';

interface ListFoldersArgs {
  project: string;
}

export async function listFolders(args: ListFoldersArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');

  const allFolders: ZephyrFolder[] = [];
  let startAt = 0;
  const maxResults = 100;

  while (true) {
    const result = await request<ZephyrListResponse<ZephyrFolder>>(
      'GET',
      '/folders',
      undefined,
      {
        projectKey: args.project,
        folderType: 'TEST_CASE',
        maxResults,
        startAt,
      }
    );
    allFolders.push(...result.values);
    if (result.isLast || result.values.length === 0) break;
    startAt += maxResults;
  }

  process.stdout.write(JSON.stringify({ values: allFolders, total: allFolders.length }, null, 2));
}
