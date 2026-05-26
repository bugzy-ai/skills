/**
 * Workflow state commands for Linear CLI
 */

import { query } from '../graphql-client';
import { compactFormatter, type OutputFormatter } from '../output';
import type { LinearWorkflowState, LinearConnection, LinearTeam } from '../types';

/**
 * Resolve a team key (e.g., "ENG") to a team ID
 */
async function resolveTeamId(teamKey: string): Promise<string> {
  const data = await query<{ teams: LinearConnection<LinearTeam> }>(`
    query FindTeam($filter: TeamFilter) {
      teams(filter: $filter) {
        nodes { id key }
      }
    }
  `, { filter: { key: { eq: teamKey } } });

  if (data.teams.nodes.length === 0) {
    throw new Error(`Team with key "${teamKey}" not found`);
  }
  return data.teams.nodes[0].id;
}

/**
 * List workflow states for a team
 */
export async function listStates(
  teamKey: string,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!teamKey) {
    throw new Error('--team is required for state list');
  }

  const teamId = await resolveTeamId(teamKey);

  const data = await query<{ workflowStates: LinearConnection<LinearWorkflowState> }>(`
    query ListStates($filter: WorkflowStateFilter) {
      workflowStates(filter: $filter) {
        nodes {
          id
          name
          type
          position
        }
      }
    }
  `, { filter: { team: { id: { eq: teamId } } } });

  output.states(data.workflowStates.nodes);
}
