/**
 * Page commands for Notion CLI
 * GET/POST/PATCH /v1/pages and GET /v1/blocks/{id}/children
 */

import { request, extractPlainText } from '../notion-client';
import type { NotionPage, NotionBlockChildren } from '../types';

/**
 * Get a page with properties and content (blocks converted to plain text)
 */
export async function getPage(pageId: string): Promise<void> {
  if (!pageId) {
    throw new Error('Page ID is required');
  }

  const page = await request<NotionPage>('GET', `/v1/pages/${pageId}`);
  const blocks = await request<NotionBlockChildren>('GET', `/v1/blocks/${pageId}/children`);

  const content = extractPlainText(blocks.results);

  console.log(JSON.stringify({
    id: page.id,
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time,
    properties: page.properties,
    content,
  }));
}

/**
 * Create a new page in a database
 */
export async function createPage(
  parentDbId: string,
  title: string,
  propertiesJson?: string
): Promise<void> {
  if (!parentDbId) {
    throw new Error('Parent database ID is required (--parent)');
  }
  if (!title) {
    throw new Error('Title is required (--title)');
  }

  let extraProperties: Record<string, unknown> = {};
  if (propertiesJson) {
    try {
      extraProperties = JSON.parse(propertiesJson);
    } catch {
      throw new Error('Invalid JSON for --properties. Provide a valid JSON string.');
    }
  }

  const body = {
    parent: { database_id: parentDbId },
    properties: {
      Name: {
        title: [{ text: { content: title } }],
      },
      ...extraProperties,
    },
  };

  const page = await request<NotionPage>('POST', '/v1/pages', body);

  console.log(JSON.stringify({
    id: page.id,
    url: page.url,
    properties: page.properties,
  }));
}

/**
 * Update page properties
 */
export async function updatePage(pageId: string, propertiesJson: string): Promise<void> {
  if (!pageId) {
    throw new Error('Page ID is required');
  }
  if (!propertiesJson) {
    throw new Error('Properties JSON is required (--properties)');
  }

  let properties: Record<string, unknown>;
  try {
    properties = JSON.parse(propertiesJson);
  } catch {
    throw new Error('Invalid JSON for --properties. Provide a valid JSON string.');
  }

  const page = await request<NotionPage>('PATCH', `/v1/pages/${pageId}`, { properties });

  console.log(JSON.stringify({
    id: page.id,
    url: page.url,
    properties: page.properties,
  }));
}
