/**
 * Team commands for Linear CLI
 */

import { query } from '../graphql-client';
import { compactFormatter, type OutputFormatter } from '../output';
import type { LinearTeam, LinearConnection } from '../types';

/**
 * List all teams in the workspace
 */
export async function listTeams(output: OutputFormatter = compactFormatter): Promise<void> {
  const data = await query<{ teams: LinearConnection<LinearTeam> }>(`
    query ListTeams {
      teams {
        nodes {
          id
          key
          name
        }
      }
    }
  `);

  output.teams(data.teams.nodes);
}
