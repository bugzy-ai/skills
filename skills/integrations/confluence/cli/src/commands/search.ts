/**
 * Search commands for Confluence CLI
 * Uses v1 search endpoint with CQL (works with search:confluence scope)
 */

import { request } from '../confluence-client';
import type { ConfluenceSearchResponse } from '../types';

/**
 * Search using CQL (Confluence Query Language)
 */
export async function searchCQL(cql: string, limit?: string): Promise<void> {
  if (!cql) {
    throw new Error('CQL query is required (--cql)');
  }

  const params: Record<string, string> = {
    cql,
    limit: limit || '25',
  };

  const data = await request<ConfluenceSearchResponse>('/search', params);

  const output = data.results.map((r) => ({
    id: r.content.id,
    type: r.content.type,
    title: r.content.title,
    status: r.content.status,
    space: r.resultGlobalContainer?.title || '',
    url: r.url,
    excerpt: r.excerpt || '',
  }));

  console.log(JSON.stringify(output));
}

/**
 * Simple text search (wraps CQL)
 */
export async function searchText(query: string, limit?: string): Promise<void> {
  if (!query) {
    throw new Error('Search query is required (--query)');
  }

  const cql = `text ~ "${query}" AND type = page`;
  await searchCQL(cql, limit);
}
