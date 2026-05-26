import { request } from '../client';
import type { ZephyrFolder } from '../types';

const VALID_FOLDER_TYPES = ['TEST_CASE', 'TEST_CYCLE', 'TEST_PLAN'] as const;

interface CreateFolderArgs {
  project: string;
  name: string;
  type: string;
}

export async function createFolder(args: CreateFolderArgs): Promise<void> {
  if (!args.project) throw new Error('--project is required');
  if (!args.name) throw new Error('--name is required');
  if (!args.type) throw new Error('--type is required');

  if (!VALID_FOLDER_TYPES.includes(args.type as typeof VALID_FOLDER_TYPES[number])) {
    throw new Error(
      `Invalid folder type: "${args.type}". Must be one of: ${VALID_FOLDER_TYPES.join(', ')}`
    );
  }

  const body = {
    projectKey: args.project,
    name: args.name,
    folderType: args.type,
  };

  const result = await request<ZephyrFolder>('POST', '/folders', body);
  process.stdout.write(JSON.stringify(result, null, 2));
}
