/**
 * Issue commands for Jira CLI
 * Handles search, get, create, update, comment, and transition operations
 */

import { request, textToAdf } from '../jira-client';

const DEFAULT_LIMIT = 50;
const DEFAULT_FIELDS = 'key,summary,status,assignee,issuetype,priority,project,created,updated';

export interface SearchOptions {
  jql: string;
  fields?: string;
  limit?: string;
  startAt?: string;
}

/**
 * Search issues using JQL via GET /search/jql
 */
export async function searchIssues(options: SearchOptions): Promise<void> {
  if (!options.jql) {
    throw new Error('--jql is required for issue search');
  }

  const limit = options.limit ? parseInt(options.limit, 10) : DEFAULT_LIMIT;
  const startAt = options.startAt ? parseInt(options.startAt, 10) : 0;
  const fields = options.fields || DEFAULT_FIELDS;

  const params = new URLSearchParams({
    jql: options.jql,
    fields,
    maxResults: String(Math.min(limit, 100)),
    startAt: String(startAt),
  });

  const result = await request<{ issues: unknown[]; total: number }>(
    'GET',
    `/search/jql?${params.toString()}`
  );

  console.log(JSON.stringify({ issues: result.issues, total: result.total }));
}

export interface GetOptions {
  fields?: string;
  expand?: string;
}

/**
 * Get a single issue by key
 */
export async function getIssue(key: string, options: GetOptions = {}): Promise<void> {
  if (!key) {
    throw new Error('Issue key is required (e.g., PROJ-123)');
  }

  const params = new URLSearchParams();
  if (options.fields) params.set('fields', options.fields);
  if (options.expand) params.set('expand', options.expand);

  const qs = params.toString();
  const path = `/issue/${encodeURIComponent(key)}${qs ? `?${qs}` : ''}`;

  const result = await request<unknown>('GET', path);
  console.log(JSON.stringify(result));
}

export interface CreateOptions {
  project: string;
  type: string;
  summary: string;
  description?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  components?: string[];
}

/**
 * Create a new issue
 */
export async function createIssue(options: CreateOptions): Promise<void> {
  if (!options.project) {
    throw new Error('--project is required for issue create');
  }
  if (!options.type) {
    throw new Error('--type is required for issue create');
  }
  if (!options.summary) {
    throw new Error('--summary is required for issue create');
  }

  const fields: Record<string, unknown> = {
    project: { key: options.project },
    issuetype: { name: options.type },
    summary: options.summary,
  };

  if (options.description) {
    fields.description = textToAdf(options.description);
  }

  if (options.priority) {
    fields.priority = { name: options.priority };
  }

  if (options.assignee) {
    fields.assignee = { accountId: options.assignee };
  }

  if (options.labels && options.labels.length > 0) {
    fields.labels = options.labels;
  }

  if (options.components && options.components.length > 0) {
    fields.components = options.components.map((name) => ({ name }));
  }

  const result = await request<unknown>('POST', '/issue', { fields });
  console.log(JSON.stringify(result));
}

export interface UpdateOptions {
  summary?: string;
  assignee?: string;
}

/**
 * Update an existing issue
 */
export async function updateIssue(key: string, options: UpdateOptions): Promise<void> {
  if (!key) {
    throw new Error('Issue key is required (e.g., PROJ-123)');
  }

  const fields: Record<string, unknown> = {};

  if (options.summary) {
    fields.summary = options.summary;
  }

  if (options.assignee) {
    fields.assignee = { accountId: options.assignee };
  }

  if (Object.keys(fields).length === 0) {
    throw new Error('No update options provided. Use --summary or --assignee.');
  }

  await request<void>('PUT', `/issue/${encodeURIComponent(key)}`, { fields });
  console.log(JSON.stringify({ key, updated: true }));
}

export interface CommentOptions {
  visibilityType?: string;
  visibilityValue?: string;
}

/**
 * Add a comment to an issue
 */
export async function commentIssue(
  key: string,
  body: string,
  options: CommentOptions = {}
): Promise<void> {
  if (!key) {
    throw new Error('Issue key is required (e.g., PROJ-123)');
  }
  if (!body) {
    throw new Error('--body is required for issue comment');
  }

  const payload: Record<string, unknown> = {
    body: textToAdf(body),
  };

  if (options.visibilityType && options.visibilityValue) {
    payload.visibility = {
      type: options.visibilityType,
      value: options.visibilityValue,
    };
  }

  const result = await request<unknown>(
    'POST',
    `/issue/${encodeURIComponent(key)}/comment`,
    payload
  );
  console.log(JSON.stringify(result));
}

/**
 * Transition an issue to a new status
 * Resolves transition name to ID via the transitions API
 */
export async function transitionIssue(key: string, toName: string): Promise<void> {
  if (!key) {
    throw new Error('Issue key is required (e.g., PROJ-123)');
  }
  if (!toName) {
    throw new Error('--to is required for issue transition');
  }

  // Get available transitions
  const transitionsResult = await request<{
    transitions: Array<{ id: string; name: string }>;
  }>('GET', `/issue/${encodeURIComponent(key)}/transitions`);

  // Try to match by name (case-insensitive) or by numeric ID
  const transition = transitionsResult.transitions.find(
    (t) =>
      t.name.toLowerCase() === toName.toLowerCase() ||
      t.id === toName
  );

  if (!transition) {
    const available = transitionsResult.transitions.map((t) => `"${t.name}" (id: ${t.id})`).join(', ');
    throw new Error(
      `Transition "${toName}" not found for ${key}. Available transitions: ${available}`
    );
  }

  await request<void>('POST', `/issue/${encodeURIComponent(key)}/transitions`, {
    transition: { id: transition.id },
  });

  console.log(JSON.stringify({ key, transitioned: true, to: transition.name }));
}
