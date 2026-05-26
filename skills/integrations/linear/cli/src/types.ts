/**
 * Linear API response types
 * Typed representations of Linear GraphQL API responses
 */

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  position: number;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export interface LinearProjectStatus {
  id: string;
  name: string;
  type?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string | null;
  content?: string | null;
  priority?: number | null;
  state?: string;
  status?: LinearProjectStatus | null;
  teams: { nodes: Array<{ id: string; key?: string; name?: string }> };
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  priorityLabel: string;
  url: string;
  state: { id: string; name: string; type: string };
  team: { id: string; key: string; name: string };
  assignee?: { id: string; name: string; email: string };
  labels: { nodes: Array<{ id: string; name: string; parent?: { id: string; name: string } | null }> };
  project?: { id: string; name: string };
  relations?: LinearConnection<LinearIssueRelation>;
  createdAt: string;
  updatedAt: string;
}

export interface LinearDocument {
  id: string;
  title: string;
  content?: string | null;
  url?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type LinearDocumentUpsertAction = 'created' | 'updated';

export interface LinearIssueDocumentUpsertResult {
  identifier: string;
  action: LinearDocumentUpsertAction;
  documentTitle: string;
  documentUrl?: string | null;
  document: LinearDocument;
}

export interface LinearComment {
  id: string;
  body: string;
  createdAt: string;
  user?: { id: string; name: string };
}

export type LinearIssueRelationType = 'blocks' | 'related' | 'duplicate';

export interface LinearIssueRelationIssue {
  id: string;
  identifier: string;
  title?: string;
  state?: { id: string; name: string; type: string };
}

export interface LinearIssueRelation {
  id: string;
  type: LinearIssueRelationType;
  issue: LinearIssueRelationIssue;
  relatedIssue: LinearIssueRelationIssue;
}

/**
 * GraphQL response wrapper
 */
export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

/**
 * Paginated connection type used by Linear API
 */
export interface LinearConnection<T> {
  nodes: T[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor?: string;
  };
}
