/**
 * Space commands for ClickUp CLI
 */

import { request, getTeamId } from '../clickup-client';
import type { ClickUpSpace } from '../types';

/**
 * List all spaces in the workspace
 */
export async function listSpaces(): Promise<void> {
  const teamId = getTeamId();
  const data = await request<{ spaces: ClickUpSpace[] }>(
    'GET',
    `/team/${teamId}/space`
  );
  console.log(JSON.stringify(data.spaces));
}
