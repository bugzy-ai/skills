/**
 * Project commands for Jira CLI
 */

import { request } from '../jira-client';

/**
 * List all projects accessible to the current user
 */
export async function listProjects(): Promise<void> {
  const result = await request<{ values: unknown[] }>('GET', '/project/search');
  console.log(JSON.stringify(result.values));
}
