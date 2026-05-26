/**
 * Field commands for Jira CLI
 */

import { request } from '../jira-client';

/**
 * List all fields (system and custom) in the Jira instance
 */
export async function listFields(): Promise<void> {
  const result = await request<unknown[]>('GET', '/field');
  console.log(JSON.stringify(result));
}
