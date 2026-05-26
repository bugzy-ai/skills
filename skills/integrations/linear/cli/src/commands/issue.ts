/**
 * Issue commands for Linear CLI
 * Handles search, get, create, update, comment, and relate operations.
 */

import { readFile } from 'node:fs/promises';
import { query } from '../graphql-client';
import { compactFormatter, type OutputFormatter } from '../output';
import type {
  LinearIssue,
  LinearConnection,
  LinearTeam,
  LinearWorkflowState,
  LinearLabel,
  LinearDocument,
  LinearIssueDocumentUpsertResult,
  LinearIssueRelation,
  LinearIssueRelationType,
} from '../types';

const DEFAULT_LIMIT = 50;

const ISSUE_FIELDS = `
  id
  identifier
  title
  description
  priority
  priorityLabel
  url
  state { id name type }
  team { id key name }
  assignee { id name email }
  labels { nodes { id name parent { id name } } }
  project { id name }
  relations(first: 50) {
    nodes {
      id
      type
      issue { id identifier title state { id name type } }
      relatedIssue { id identifier title state { id name type } }
    }
  }
  createdAt
  updatedAt
`;

const DOCUMENT_FIELDS = `
  id
  title
  content
  url
  createdAt
  updatedAt
`;

function parsePriorityFlag(value: string): number {
  const asInt = Number(value);
  if (Number.isInteger(asInt) && asInt >= 0 && asInt <= 4) return asInt;
  throw new Error(`Invalid --priority "${value}". Use a Linear-native value from 0 to 4.`);
}

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

async function resolveStateId(stateName: string, teamId: string): Promise<string> {
  const data = await query<{ workflowStates: LinearConnection<LinearWorkflowState> }>(`
    query FindState($filter: WorkflowStateFilter) {
      workflowStates(filter: $filter) {
        nodes { id name }
      }
    }
  `, {
    filter: {
      team: { id: { eq: teamId } },
      name: { eqIgnoreCase: stateName },
    },
  });

  if (data.workflowStates.nodes.length === 0) {
    throw new Error(`Workflow state "${stateName}" not found for team`);
  }
  return data.workflowStates.nodes[0].id;
}

async function resolveLabelId(labelName: string, teamId?: string): Promise<string> {
  const filter: Record<string, unknown> = {
    name: { eqIgnoreCase: labelName },
  };
  if (teamId) {
    filter.team = { id: { eq: teamId } };
  }

  const data = await query<{ issueLabels: LinearConnection<LinearLabel> }>(`
    query FindLabel($filter: IssueLabelFilter) {
      issueLabels(filter: $filter) {
        nodes { id name }
      }
    }
  `, { filter });

  if (data.issueLabels.nodes.length === 0) {
    // Workspace-level label fallback.
    if (teamId) {
      return resolveLabelId(labelName);
    }
    throw new Error(`Label "${labelName}" not found`);
  }
  return data.issueLabels.nodes[0].id;
}

/** Resolve multiple label names to ids, deduplicated, preserving first-occurrence order. */
async function resolveLabelIds(names: string[], teamId?: string): Promise<string[]> {
  const seenNames = new Set<string>();
  const uniqueNames: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seenNames.has(lower)) continue;
    seenNames.add(lower);
    uniqueNames.push(name);
  }
  const ids = await Promise.all(uniqueNames.map((n) => resolveLabelId(n, teamId)));
  const seenIds = new Set<string>();
  return ids.filter((id) => {
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}

async function resolveProjectId(projectName: string): Promise<string | null> {
  const data = await query<{ projects: LinearConnection<{ id: string; name: string }> }>(`
    query FindProject($filter: ProjectFilter) {
      projects(filter: $filter) {
        nodes { id name }
      }
    }
  `, { filter: { name: { eqIgnoreCase: projectName } } });

  return data.projects.nodes.length === 0 ? null : data.projects.nodes[0].id;
}

async function resolveIssueId(identifier: string): Promise<string> {
  if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return identifier;
  }

  const data = await query<{ searchIssues: LinearConnection<{ id: string; identifier: string }> }>(`
    query FindIssue($term: String!) {
      searchIssues(term: $term, first: 1) {
        nodes { id identifier }
      }
    }
  `, { term: identifier });

  if (data.searchIssues.nodes.length === 0) {
    throw new Error(`Issue "${identifier}" not found`);
  }
  return data.searchIssues.nodes[0].id;
}

/** Read description from either inline value or file path. Throws if both supplied. */
async function readDescription(
  description: string | undefined,
  descriptionFile: string | undefined,
  flagName: '--description' | '--body',
): Promise<string | undefined> {
  if (description !== undefined && descriptionFile !== undefined) {
    throw new Error(`Cannot pass both ${flagName} and ${flagName}-file. Choose one.`);
  }
  if (descriptionFile !== undefined) {
    return readFile(descriptionFile, 'utf8');
  }
  return description;
}

export interface SearchOptions {
  query?: string;
  team?: string;
  state?: string;
  labels?: string[];
  /** @deprecated kept for callers that still pass a single label string. Prefer `labels`. */
  label?: string;
  limit?: string;
}

export async function searchIssues(
  options: SearchOptions,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  const limit = options.limit ? parseInt(options.limit, 10) : DEFAULT_LIMIT;
  const labelNames = options.labels?.length
    ? options.labels
    : options.label
      ? [options.label]
      : [];

  const filter: Record<string, unknown> = {};

  if (options.team) {
    const teamId = await resolveTeamId(options.team);
    filter.team = { id: { eq: teamId } };
  }

  if (options.state) {
    filter.state = { name: { eqIgnoreCase: options.state } };
  }

  if (labelNames.length === 1) {
    filter.labels = { some: { name: { eqIgnoreCase: labelNames[0] } } };
  } else if (labelNames.length > 1) {
    // Linear requires AND semantics for "must have all of these labels". Each label
    // becomes its own `some` clause, combined with the issue-level `and` array.
    filter.and = labelNames.map((name) => ({
      labels: { some: { name: { eqIgnoreCase: name } } },
    }));
  }

  if (options.query) {
    const variables: Record<string, unknown> = {
      term: options.query,
      first: limit,
      includeComments: true,
    };
    if (options.team) {
      const teamId = filter.team
        ? (filter.team as Record<string, Record<string, string>>).id.eq
        : await resolveTeamId(options.team);
      variables.teamId = teamId;
      delete filter.team;
    }
    if (Object.keys(filter).length > 0) {
      variables.filter = filter;
    }

    const data = await query<{ searchIssues: LinearConnection<LinearIssue> }>(`
      query SearchIssues($term: String!, $first: Int, $filter: IssueFilter, $teamId: String, $includeComments: Boolean) {
        searchIssues(term: $term, first: $first, filter: $filter, teamId: $teamId, includeComments: $includeComments) {
          nodes { ${ISSUE_FIELDS} }
        }
      }
    `, variables);

    output.issueList(data.searchIssues.nodes);
  } else {
    const data = await query<{ issues: LinearConnection<LinearIssue> }>(`
      query ListIssues($first: Int, $filter: IssueFilter) {
        issues(first: $first, filter: $filter) {
          nodes { ${ISSUE_FIELDS} }
        }
      }
    `, { first: limit, filter: Object.keys(filter).length > 0 ? filter : undefined });

    output.issueList(data.issues.nodes);
  }
}

export async function getIssue(
  identifier: string,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!identifier) {
    throw new Error('Issue identifier is required (e.g., ENG-123 or UUID)');
  }

  const issueId = await resolveIssueId(identifier);

  const data = await query<{ issue: LinearIssue }>(`
    query GetIssue($id: String!) {
      issue(id: $id) {
        ${ISSUE_FIELDS}
      }
    }
  `, { id: issueId });

  output.issue(data.issue);
}

export interface CreateOptions {
  team: string;
  title: string;
  description?: string;
  descriptionFile?: string;
  priority?: string;
  labels?: string[];
  /** @deprecated single-label form for backward compat. Prefer `labels`. */
  label?: string;
  state?: string;
  project?: string;
}

export async function createIssue(
  options: CreateOptions,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!options.team) {
    throw new Error('--team is required for issue create');
  }
  if (!options.title) {
    throw new Error('--title is required for issue create');
  }

  const teamId = await resolveTeamId(options.team);
  const description = await readDescription(options.description, options.descriptionFile, '--description');

  const labelNames = options.labels?.length
    ? options.labels
    : options.label
      ? [options.label]
      : [];

  const input: Record<string, unknown> = {
    teamId,
    title: options.title,
  };

  if (description !== undefined) {
    input.description = description;
  }

  if (options.priority) {
    input.priority = parsePriorityFlag(options.priority);
  }

  if (labelNames.length > 0) {
    input.labelIds = await resolveLabelIds(labelNames, teamId);
  }

  if (options.state) {
    input.stateId = await resolveStateId(options.state, teamId);
  }

  if (options.project) {
    const projectId = await resolveProjectId(options.project);
    if (!projectId) {
      throw new Error(`Project "${options.project}" not found`);
    }
    input.projectId = projectId;
  }

  const data = await query<{ issueCreate: { issue: LinearIssue } }>(`
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { ${ISSUE_FIELDS} }
      }
    }
  `, { input });

  output.issue(data.issueCreate.issue);
}

export interface UpdateOptions {
  state?: string;
  priority?: string;
  assignee?: string;
  title?: string;
  description?: string;
  descriptionFile?: string;
  labels?: string[];
  /** @deprecated single-label form. Prefer `labels`. */
  label?: string;
  project?: string;
}

export async function updateIssue(
  identifier: string,
  options: UpdateOptions,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!identifier) {
    throw new Error('Issue identifier is required (e.g., ENG-123 or UUID)');
  }

  const issueId = await resolveIssueId(identifier);
  const input: Record<string, unknown> = {};

  // We need the team id for label / state resolution. Defer the query until needed.
  let cachedTeamId: string | undefined;
  async function getTeamId(): Promise<string> {
    if (cachedTeamId) return cachedTeamId;
    const issueData = await query<{ issue: { team: { id: string } } }>(`
      query GetIssueTeam($id: String!) {
        issue(id: $id) { team { id } }
      }
    `, { id: issueId });
    cachedTeamId = issueData.issue.team.id;
    return cachedTeamId;
  }

  if (options.state) {
    input.stateId = await resolveStateId(options.state, await getTeamId());
  }

  if (options.priority) {
    input.priority = parsePriorityFlag(options.priority);
  }

  if (options.assignee) {
    const userData = await query<{ users: LinearConnection<{ id: string }> }>(`
      query FindUser($filter: UserFilter) {
        users(filter: $filter) {
          nodes { id }
        }
      }
    `, { filter: { email: { eq: options.assignee } } });

    if (userData.users.nodes.length === 0) {
      throw new Error(`User with email "${options.assignee}" not found`);
    }
    input.assigneeId = userData.users.nodes[0].id;
  }

  if (options.title) {
    input.title = options.title;
  }

  const description = await readDescription(options.description, options.descriptionFile, '--description');
  if (description !== undefined) {
    input.description = description;
  }

  // Label updates: labelIds REPLACES the issue's current set. Documented in --help.
  const labelNames = options.labels?.length
    ? options.labels
    : options.label
      ? [options.label]
      : [];
  if (labelNames.length > 0) {
    input.labelIds = await resolveLabelIds(labelNames, await getTeamId());
  }

  if (options.project) {
    const projectId = await resolveProjectId(options.project);
    if (!projectId) {
      throw new Error(`Project "${options.project}" not found`);
    }
    input.projectId = projectId;
  }

  if (Object.keys(input).length === 0) {
    throw new Error('No update options provided');
  }

  const data = await query<{ issueUpdate: { issue: LinearIssue } }>(`
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        issue { ${ISSUE_FIELDS} }
      }
    }
  `, { id: issueId, input });

  output.issue(data.issueUpdate.issue);
}

export interface DocumentUpsertOptions {
  title: string;
  contentFile: string;
}

export async function documentUpsertIssue(
  identifier: string,
  options: DocumentUpsertOptions,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!identifier) {
    throw new Error('Issue identifier is required (e.g., ENG-123 or UUID)');
  }
  if (!options.title) {
    throw new Error('--title is required for issue document-upsert');
  }
  if (!options.contentFile) {
    throw new Error('--content-file is required for issue document-upsert');
  }

  const content = await readFile(options.contentFile, 'utf8');
  const issueId = await resolveIssueId(identifier);

  const issueData = await query<{ issue: { id: string; identifier: string; documents: LinearConnection<LinearDocument> } }>(`
    query GetIssueDocuments($id: String!) {
      issue(id: $id) {
        id
        identifier
        documents(first: 50) {
          nodes { ${DOCUMENT_FIELDS} }
        }
      }
    }
  `, { id: issueId });

  const matches = issueData.issue.documents.nodes.filter((document) => document.title === options.title);
  if (matches.length > 1) {
    throw new Error(`Found ${matches.length} documents titled "${options.title}" on ${issueData.issue.identifier}. Delete duplicates before upserting.`);
  }

  let action: LinearIssueDocumentUpsertResult['action'];
  let document: LinearDocument;
  if (matches.length === 0) {
    const data = await query<{ documentCreate: { document: LinearDocument } }>(`
      mutation CreateDocument($input: DocumentCreateInput!) {
        documentCreate(input: $input) {
          document { ${DOCUMENT_FIELDS} }
        }
      }
    `, { input: { issueId: issueData.issue.id, title: options.title, content } });
    action = 'created';
    document = data.documentCreate.document;
  } else {
    const data = await query<{ documentUpdate: { document: LinearDocument } }>(`
      mutation UpdateDocument($id: String!, $input: DocumentUpdateInput!) {
        documentUpdate(id: $id, input: $input) {
          document { ${DOCUMENT_FIELDS} }
        }
      }
    `, { id: matches[0].id, input: { title: options.title, content } });
    action = 'updated';
    document = data.documentUpdate.document;
  }

  output.documentUpsert({
    identifier: issueData.issue.identifier,
    action,
    documentTitle: document.title,
    documentUrl: document.url,
    document,
  });
}

export interface CommentOptions {
  body?: string;
  bodyFile?: string;
}

export async function commentIssue(
  identifier: string,
  options: CommentOptions | string,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!identifier) {
    throw new Error('Issue identifier is required (e.g., ENG-123 or UUID)');
  }

  // Backward compat: prior signature was `commentIssue(identifier, body, output)`.
  const opts: CommentOptions = typeof options === 'string' ? { body: options } : options;
  const body = await readDescription(opts.body, opts.bodyFile, '--body');
  if (!body) {
    throw new Error('--body is required for issue comment (or use --body-file to read from a file)');
  }

  const issueId = await resolveIssueId(identifier);

  const data = await query<{ commentCreate: { comment: { id: string; body: string; createdAt: string } } }>(`
    mutation CommentIssue($input: CommentCreateInput!) {
      commentCreate(input: $input) {
        comment {
          id
          body
          createdAt
        }
      }
    }
  `, { input: { issueId, body } });

  output.comment(data.commentCreate.comment);
}

export interface RelateOptions {
  blocks?: string;
  related?: string;
}

export async function relateIssue(
  identifier: string,
  options: RelateOptions,
  output: OutputFormatter = compactFormatter
): Promise<void> {
  if (!identifier) {
    throw new Error('Issue identifier is required (e.g., ENG-123 or UUID)');
  }

  let type: LinearIssueRelationType;
  let target: string;
  if (options.blocks && options.related) {
    throw new Error('Pass either --blocks or --related, not both.');
  } else if (options.blocks) {
    type = 'blocks';
    target = options.blocks;
  } else if (options.related) {
    type = 'related';
    target = options.related;
  } else {
    throw new Error('--blocks <id> or --related <id> is required for issue relate');
  }

  const [issueId, relatedIssueId] = await Promise.all([
    resolveIssueId(identifier),
    resolveIssueId(target),
  ]);

  const data = await query<{ issueRelationCreate: { issueRelation: LinearIssueRelation } }>(`
    mutation CreateIssueRelation($input: IssueRelationCreateInput!) {
      issueRelationCreate(input: $input) {
        issueRelation {
          id
          type
          issue { id identifier }
          relatedIssue { id identifier }
        }
      }
    }
  `, { input: { issueId, relatedIssueId, type } });

  output.relation(data.issueRelationCreate.issueRelation);
}
