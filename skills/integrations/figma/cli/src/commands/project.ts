/**
 * Project commands for Figma CLI
 * Read-only operations on Figma project files
 */

import { request } from '../figma-client';
import type { FigmaProjectFile } from '../types';

/**
 * List files in a project
 * GET /v1/projects/:project_id/files
 */
export async function listFiles(projectId: string): Promise<void> {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }

  const data = await request<{ files: FigmaProjectFile[] }>(
    `/projects/${projectId}/files`
  );

  const output = (data.files || []).map((f) => ({
    key: f.key,
    name: f.name,
    lastModified: f.last_modified,
    thumbnailUrl: f.thumbnail_url,
  }));

  console.log(JSON.stringify(output));
}
