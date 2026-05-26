/**
 * Space commands for Confluence CLI
 * Read-only operations on Confluence spaces
 * Uses v1 search with CQL `type=space` (works with search:confluence scope)
 */

import { request } from '../confluence-client';
import type { ConfluenceSearchResponse } from '../types';

/**
 * List all spaces via CQL search
 */
export async function listSpaces(): Promise<void> {
  const data = await request<ConfluenceSearchResponse>('/search', {
    cql: 'type=space',
    limit: '50',
  });

  const output = data.results.map((r) => ({
    key: r.space?.key || '',
    name: r.space?.name || '',
    type: r.space?.type || '',
    status: r.space?.status || '',
  }));

  console.log(JSON.stringify(output));
}
