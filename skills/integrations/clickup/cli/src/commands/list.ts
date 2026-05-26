/**
 * List commands for ClickUp CLI
 * Lists both folder-based and folderless lists within a space
 */

import { request } from '../clickup-client';
import type { ClickUpList, ClickUpFolder } from '../types';

/**
 * List all lists in a space (both folderless and within folders)
 */
export async function listLists(spaceId: string): Promise<void> {
  if (!spaceId) {
    throw new Error('--space is required for list list');
  }

  // Get folderless lists
  const folderlessData = await request<{ lists: ClickUpList[] }>(
    'GET',
    `/space/${spaceId}/list`
  );

  // Get folders and their lists
  const folderData = await request<{ folders: ClickUpFolder[] }>(
    'GET',
    `/space/${spaceId}/folder`
  );

  const allLists: Array<ClickUpList & { folder_name?: string }> = [];

  // Add folderless lists
  for (const list of folderlessData.lists) {
    allLists.push(list);
  }

  // Add lists from folders with folder annotation
  for (const folder of folderData.folders) {
    for (const list of folder.lists) {
      allLists.push({ ...list, folder_name: folder.name });
    }
  }

  console.log(JSON.stringify(allLists));
}
