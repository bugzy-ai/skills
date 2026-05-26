/**
 * File commands for Figma CLI
 * Read-only operations on Figma files and nodes
 */

import { request } from '../figma-client';
import type { FigmaFile, FigmaNodesResponse } from '../types';

/**
 * Get a Figma file's structure and metadata
 * GET /v1/files/:key?depth=N
 */
export async function getFile(fileKey: string, depth?: string): Promise<void> {
  if (!fileKey) {
    throw new Error('File key is required');
  }

  const params: Record<string, string> = {};
  if (depth) params.depth = depth;

  const data = await request<FigmaFile>(`/files/${fileKey}`, params);

  const pages = data.document.children?.map((page) => ({
    id: page.id,
    name: page.name,
    type: page.type,
    childCount: page.children?.length || 0,
  })) || [];

  const output = {
    name: data.name,
    lastModified: data.lastModified,
    version: data.version,
    role: data.role,
    editorType: data.editorType,
    pages,
  };

  console.log(JSON.stringify(output));
}

/**
 * Get lightweight file metadata without full document tree
 * GET /v1/files/:key?depth=1 (minimal depth)
 */
export async function getFileMeta(fileKey: string): Promise<void> {
  if (!fileKey) {
    throw new Error('File key is required');
  }

  const data = await request<FigmaFile>(`/files/${fileKey}`, { depth: '1' });

  const output = {
    name: data.name,
    lastModified: data.lastModified,
    version: data.version,
    role: data.role,
    editorType: data.editorType,
    pageCount: data.document.children?.length || 0,
    pageNames: data.document.children?.map((p) => p.name) || [],
  };

  console.log(JSON.stringify(output));
}

/**
 * Get specific nodes by ID from a file
 * GET /v1/files/:key/nodes?ids=comma-separated
 */
export async function getNodes(fileKey: string, ids: string, depth?: string): Promise<void> {
  if (!fileKey) {
    throw new Error('File key is required');
  }
  if (!ids) {
    throw new Error('Node IDs are required (--ids)');
  }

  const params: Record<string, string> = { ids };
  if (depth) params.depth = depth;

  const data = await request<FigmaNodesResponse>(`/files/${fileKey}/nodes`, params);

  const output = Object.entries(data.nodes).map(([nodeId, node]) => ({
    id: nodeId,
    name: node.document.name,
    type: node.document.type,
    children: node.document.children?.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
    })) || [],
  }));

  console.log(JSON.stringify(output));
}
