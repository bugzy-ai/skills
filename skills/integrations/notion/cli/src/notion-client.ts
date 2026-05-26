/**
 * Notion REST API client
 * Uses native fetch() with Bearer token authentication
 * Single retry on 429 with Retry-After header
 */

import type { RichText, NotionBlock } from './types';

const BASE_URL = 'https://api.notion.com';
const NOTION_VERSION = '2022-06-28';
const MAX_RETRIES = 1;

/**
 * Get and validate the Notion token from environment
 */
export function getToken(): string {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error(
      'NOTION_TOKEN environment variable is required. ' +
        'Set it to your Notion integration token.'
    );
  }
  return token;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an HTTP request to the Notion REST API with retry on 429
 */
export async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown,
  attempt: number = 0
): Promise<T> {
  const token = getToken();

  const url = `${BASE_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
    await delay(retryAfter * 1000);
    return request<T>(method, path, body, attempt + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API error ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

/**
 * Extract plain text from a rich_text array
 */
export function richTextToPlain(richText: RichText[]): string {
  return richText.map((rt) => rt.plain_text).join('');
}

/**
 * Extract plain text content from Notion blocks
 * Walks common block types and concatenates plain_text from rich_text arrays
 */
export function extractPlainText(blocks: NotionBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    const type = block.type;
    const data = block[type] as { rich_text?: RichText[] } | undefined;

    if (data?.rich_text) {
      const text = richTextToPlain(data.rich_text);
      if (text) lines.push(text);
    }
  }

  return lines.join('\n');
}
