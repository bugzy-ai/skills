/**
 * Status commands for ClickUp CLI
 * Lists statuses for a specific list (statuses are per-list in ClickUp)
 */

import { request } from '../clickup-client';
import type { ClickUpList } from '../types';

/**
 * List statuses for a list
 */
export async function listStatuses(listId: string): Promise<void> {
  if (!listId) {
    throw new Error('--list is required for status list');
  }

  const list = await request<ClickUpList>('GET', `/list/${listId}`);
  console.log(JSON.stringify(list.statuses || []));
}
