/**
 * Style commands for Figma CLI
 * Read-only operations on Figma design token styles
 */

import { request } from '../figma-client';
import type { FigmaStyle, FigmaFileMetaResponse } from '../types';

/**
 * List design token styles in a file
 * GET /v1/files/:key/styles
 */
export async function listStyles(fileKey: string): Promise<void> {
  if (!fileKey) {
    throw new Error('File key is required (--file)');
  }

  const data = await request<FigmaFileMetaResponse<FigmaStyle>>(
    `/files/${fileKey}/styles`
  );

  const styles = data.meta.styles || [];

  const output = styles.map((s) => ({
    key: s.key,
    name: s.name,
    styleType: s.style_type,
    description: s.description,
    nodeId: s.node_id,
  }));

  console.log(JSON.stringify(output));
}

/**
 * Get a single style's metadata by style key
 * GET /v1/styles/:key
 */
export async function getStyle(styleKey: string): Promise<void> {
  if (!styleKey) {
    throw new Error('Style key is required');
  }

  const data = await request<{ meta: FigmaStyle }>(`/styles/${styleKey}`);

  const s = data.meta;
  const output = {
    key: s.key,
    fileKey: s.file_key,
    name: s.name,
    styleType: s.style_type,
    description: s.description,
    nodeId: s.node_id,
    thumbnailUrl: s.thumbnail_url,
  };

  console.log(JSON.stringify(output));
}
