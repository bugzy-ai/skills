/**
 * Database commands for Notion CLI
 * GET /v1/databases/{id} and POST /v1/databases/{id}/query
 */

import { request } from '../notion-client';
import type { NotionDatabase, NotionListResponse } from '../types';

/**
 * Get database schema (properties and metadata)
 */
export async function getDatabase(dbId: string): Promise<void> {
  if (!dbId) {
    throw new Error('Database ID is required');
  }

  const db = await request<NotionDatabase>('GET', `/v1/databases/${dbId}`);

  console.log(JSON.stringify({
    id: db.id,
    url: db.url,
    title: db.title,
    properties: db.properties,
  }));
}

/**
 * Query database rows with optional filter and limit
 */
export async function queryDatabase(
  dbId: string,
  filterJson?: string,
  limit?: string
): Promise<void> {
  if (!dbId) {
    throw new Error('Database ID is required');
  }

  const body: Record<string, unknown> = {
    page_size: limit ? parseInt(limit, 10) : 25,
  };

  if (filterJson) {
    try {
      body.filter = JSON.parse(filterJson);
    } catch {
      throw new Error('Invalid JSON for --filter. Provide a valid JSON string.');
    }
  }

  const data = await request<NotionListResponse>('POST', `/v1/databases/${dbId}/query`, body);

  console.log(JSON.stringify({
    results: data.results,
    has_more: data.has_more,
    next_cursor: data.next_cursor,
  }));
}
