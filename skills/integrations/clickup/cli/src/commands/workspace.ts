/**
 * Workspace commands for ClickUp CLI
 * Lists authorized workspaces (teams)
 */

import { request } from '../clickup-client';
import type { ClickUpTeam } from '../types';

/**
 * List authorized workspaces (teams)
 */
export async function listWorkspaces(): Promise<void> {
  const data = await request<{ teams: ClickUpTeam[] }>('GET', '/team');
  console.log(JSON.stringify(data.teams));
}
