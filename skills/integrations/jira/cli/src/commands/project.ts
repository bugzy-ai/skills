/**
 * Project commands for Jira CLI
 */

import { request } from '../jira-client';

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

/**
 * List all projects accessible to the current user
 */
export async function listProjects(): Promise<void> {
  const result = await request<{ values: unknown[] }>('GET', '/project/search');
  console.log(JSON.stringify(result.values));
}

export async function getProject(projectIdOrKey: string): Promise<JiraProject> {
  if (!projectIdOrKey) throw new Error('--project is required');
  return request<JiraProject>('GET', `/project/${encodeURIComponent(projectIdOrKey)}`);
}
