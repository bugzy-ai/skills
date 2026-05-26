/**
 * Label commands for Linear CLI
 */

import { query } from '../graphql-client';
import { compactFormatter, type OutputFormatter } from '../output';
import type { LinearLabel, LinearConnection, LinearTeam } from '../types';

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
 * List labels, optionally filtered by team
 */
export async function listLabels(
  teamKey?: string,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  let filter: Record<string, unknown> | undefined;

  if (teamKey) {
    const teamId = await resolveTeamId(teamKey);
    filter = { team: { id: { eq: teamId } } };
  }

  const data = await query<{ issueLabels: LinearConnection<LinearLabel> }>(`
    query ListLabels($filter: IssueLabelFilter) {
      issueLabels(filter: $filter) {
        nodes {
          id
          name
          color
        }
      }
    }
  `, { filter });

  output.labels(data.issueLabels.nodes);
}
