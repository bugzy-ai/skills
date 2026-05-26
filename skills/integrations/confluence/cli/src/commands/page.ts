/**
 * Page commands for Confluence CLI
 * Read-only operations on Confluence pages
 * Uses v1 search with CQL + expand (works with search:confluence scope)
 */

import { request, stripHtml } from '../confluence-client';
import type { ConfluenceSearchResponse } from '../types';

/**
 * Get a single page with body content (converted to plain text)
 * Uses CQL: id=<pageId> AND type=page with expand for body + metadata
 */
export async function getPage(pageId: string): Promise<void> {
  if (!pageId) {
    throw new Error('Page ID is required');
  }

  const data = await request<ConfluenceSearchResponse>('/search', {
    cql: `id=${pageId} AND type=page`,
    limit: '1',
    expand: 'content.body.storage,content.space,content.version,content.metadata.labels',
  });

  if (data.results.length === 0) {
    throw new Error(`Page ${pageId} not found`);
  }

  const content = data.results[0].content;

  const output: Record<string, unknown> = {
    id: content.id,
    title: content.title,
    status: content.status,
    spaceKey: content.space?.key || '',
    version: content.version ? { number: content.version.number } : undefined,
    labels: content.metadata?.labels?.results.map((l) => l.name) || [],
    body: content.body?.storage?.value ? stripHtml(content.body.storage.value) : '',
    url: content._links?.webui || '',
  };

  console.log(JSON.stringify(output));
}

/**
 * List child pages of a given page
 * Uses CQL: parent=<pageId> AND type=page
 */
export async function listChildren(pageId: string, limit?: string): Promise<void> {
  if (!pageId) {
    throw new Error('Page ID is required');
  }

  const data = await request<ConfluenceSearchResponse>('/search', {
    cql: `parent=${pageId} AND type=page`,
    limit: limit || '25',
  });

  const output = data.results.map((r) => ({
    id: r.content.id,
    title: r.content.title,
    status: r.content.status,
  }));

  console.log(JSON.stringify(output));
}
