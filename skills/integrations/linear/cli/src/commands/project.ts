/**
 * Project commands for Linear CLI
 */

import { query } from '../graphql-client';
import { compactFormatter, type OutputFormatter, type ProjectOutput } from '../output';
import type { LinearProject, LinearConnection, LinearTeam } from '../types';

const PROJECT_FIELDS = `
  id
  name
  description
  content
  priority
  state
  status { id name type }
  teams { nodes { id key name } }
`;

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
 * List projects, optionally filtered by team
 */
export async function listProjects(
  teamKey?: string,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  let filter: Record<string, unknown> | undefined;

  if (teamKey) {
    const teamId = await resolveTeamId(teamKey);
    filter = { accessibleTeams: { some: { id: { eq: teamId } } } };
  }

  const data = await query<{ projects: LinearConnection<LinearProject> }>(`
    query ListProjects($filter: ProjectFilter) {
      projects(filter: $filter) {
        nodes { ${PROJECT_FIELDS} }
      }
    }
  `, { filter });

  output.projects(data.projects.nodes.map(toProjectOutput));
}

export async function getProject(
  nameOrId: string,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!nameOrId) {
    throw new Error('Project name or ID is required');
  }

  const project = isUuid(nameOrId)
    ? await fetchProjectById(nameOrId)
    : await fetchProjectByName(nameOrId);

  if (!project) {
    throw new Error(`Project "${nameOrId}" not found`);
  }

  output.project(toProjectOutput(project));
}

async function fetchProjectById(id: string): Promise<LinearProject | null> {
  const data = await query<{ project: LinearProject | null }>(`
    query GetProject($id: String!) {
      project(id: $id) { ${PROJECT_FIELDS} }
    }
  `, { id });
  return data.project;
}

async function fetchProjectByName(name: string): Promise<LinearProject | null> {
  const data = await query<{ projects: LinearConnection<LinearProject> }>(`
    query FindProject($filter: ProjectFilter) {
      projects(filter: $filter) {
        nodes { ${PROJECT_FIELDS} }
      }
    }
  `, { filter: { name: { eqIgnoreCase: name } } });

  if (data.projects.nodes.length > 1) {
    throw new Error(`Multiple projects named "${name}" found`);
  }
  return data.projects.nodes[0] ?? null;
}

function toProjectOutput(project: LinearProject): ProjectOutput {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    content: project.content,
    priority: project.priority,
    state: project.state,
    status: project.status,
    teamIds: project.teams.nodes.map((team) => team.id),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
