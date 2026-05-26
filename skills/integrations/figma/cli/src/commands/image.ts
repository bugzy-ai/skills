/**
 * Image commands for Figma CLI
 * Export nodes as rendered images (URLs expire after 30 days)
 */

import { request } from '../figma-client';
import type { FigmaImageResponse } from '../types';

/**
 * Export nodes as rendered image URLs
 * GET /v1/images/:key?ids=comma-separated&scale=N&format=png|jpg|svg|pdf
 */
export async function exportImages(
  fileKey: string,
  ids: string,
  scale?: string,
  format?: string
): Promise<void> {
  if (!fileKey) {
    throw new Error('File key is required');
  }
  if (!ids) {
    throw new Error('Node IDs are required (--ids)');
  }

  const params: Record<string, string> = { ids };
  if (scale) params.scale = scale;
  if (format) params.format = format;

  const data = await request<FigmaImageResponse>(`/images/${fileKey}`, params);

  if (data.err) {
    throw new Error(`Figma image export error: ${data.err}`);
  }

  const output = Object.entries(data.images).map(([nodeId, url]) => ({
    nodeId,
    url: url || null,
  }));

  console.log(JSON.stringify(output));
}
