/**
 * Team commands for Figma CLI
 * Read-only operations on Figma team projects
 */

import { request } from '../figma-client';
import type { FigmaProject } from '../types';

/**
 * List projects in a team
 * GET /v1/teams/:team_id/projects
 */
export async function listProjects(teamId: string): Promise<void> {
  if (!teamId) {
    // Fall back to FIGMA_TEAM_ID environment variable
    teamId = process.env.FIGMA_TEAM_ID || '';
  }
  if (!teamId) {
    throw new Error('Team ID is required. Provide it as an argument or set FIGMA_TEAM_ID.');
  }

  const data = await request<{ projects: FigmaProject[] }>(
    `/teams/${teamId}/projects`
  );

  const output = (data.projects || []).map((p) => ({
    id: p.id,
    name: p.name,
  }));

  console.log(JSON.stringify(output));
}
