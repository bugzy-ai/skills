/**
 * Search command for Notion CLI
 * POST /v1/search — search across workspace pages and databases
 */

import { request } from '../notion-client';
import type { NotionListResponse } from '../types';

/**
 * Search the Notion workspace
 */
export async function search(query: string, filter?: string, limit?: string): Promise<void> {
  if (!query) {
    throw new Error('Search query is required (--query)');
  }

  const body: Record<string, unknown> = {
    query,
    page_size: limit ? parseInt(limit, 10) : 25,
  };

  if (filter === 'page' || filter === 'database') {
    body.filter = { value: filter, property: 'object' };
  }

  const data = await request<NotionListResponse>('POST', '/v1/search', body);

  console.log(JSON.stringify({
    results: data.results,
    has_more: data.has_more,
    next_cursor: data.next_cursor,
  }));
}
