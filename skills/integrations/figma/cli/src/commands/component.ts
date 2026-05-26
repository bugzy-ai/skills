/**
 * Component commands for Figma CLI
 * Read-only operations on Figma components and component sets
 */

import { request } from '../figma-client';
import type { FigmaComponent, FigmaComponentSet, FigmaFileMetaResponse } from '../types';

/**
 * List published components in a file
 * GET /v1/files/:key/components
 */
export async function listComponents(fileKey: string): Promise<void> {
  if (!fileKey) {
    throw new Error('File key is required (--file)');
  }

  const data = await request<FigmaFileMetaResponse<FigmaComponent>>(
    `/files/${fileKey}/components`
  );

  const components = data.meta.components || [];

  const output = components.map((c) => ({
    key: c.key,
    name: c.name,
    description: c.description,
    nodeId: c.node_id,
    containingFrame: c.containing_frame?.name || '',
    pageName: c.containing_frame?.pageName || '',
  }));

  console.log(JSON.stringify(output));
}

/**
 * Get a single component's metadata by component key
 * GET /v1/components/:key
 */
export async function getComponent(componentKey: string): Promise<void> {
  if (!componentKey) {
    throw new Error('Component key is required');
  }

  const data = await request<{ meta: FigmaComponent }>(`/components/${componentKey}`);

  const c = data.meta;
  const output = {
    key: c.key,
    fileKey: c.file_key,
    name: c.name,
    description: c.description,
    nodeId: c.node_id,
    thumbnailUrl: c.thumbnail_url,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    containingFrame: c.containing_frame?.name || '',
    pageName: c.containing_frame?.pageName || '',
  };

  console.log(JSON.stringify(output));
}

/**
 * List component sets (variant groups) in a file
 * GET /v1/files/:key/component_sets
 */
export async function listComponentSets(fileKey: string): Promise<void> {
  if (!fileKey) {
    throw new Error('File key is required (--file)');
  }

  const data = await request<FigmaFileMetaResponse<FigmaComponentSet>>(
    `/files/${fileKey}/component_sets`
  );

  const sets = data.meta.component_sets || [];

  const output = sets.map((s) => ({
    key: s.key,
    name: s.name,
    description: s.description,
    nodeId: s.node_id,
  }));

  console.log(JSON.stringify(output));
}
