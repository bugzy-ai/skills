import type {
  LinearLabel,
  LinearIssueDocumentUpsertResult,
  LinearProject,
  LinearTeam,
  LinearWorkflowState,
} from './types';

export interface IssueOutput {
  id?: string;
  identifier?: string;
  title?: string;
  description?: string;
  priority?: number | null;
  url?: string;
  state?: { name?: string };
  team?: { key?: string; name?: string };
  assignee?: { name?: string };
  labels?: { nodes?: Array<{ name?: string; parent?: { name?: string } | null }> };
  project?: { name?: string };
  relations?: { nodes?: RelationOutput[] };
}

export interface CommentOutput {
  id?: string;
  body?: string;
  createdAt?: string;
}

export interface RelationIssueOutput {
  id?: string;
  identifier?: string;
  title?: string;
  state?: { name?: string; type?: string };
}

export interface RelationOutput {
  id?: string;
  type?: string;
  issue?: RelationIssueOutput;
  relatedIssue?: RelationIssueOutput;
}

export interface ProjectOutput {
  id?: string;
  name: string;
  description?: string | null;
  content?: string | null;
  priority?: number | null;
  state?: string;
  status?: LinearProject['status'];
  teamIds?: string[];
  teams?: LinearProject['teams'];
}

export interface OutputFormatter {
  issueList(issues: IssueOutput[]): void;
  issue(issue: IssueOutput): void;
  comment(comment: CommentOutput): void;
  relation(relation: RelationOutput): void;
  documentUpsert(result: LinearIssueDocumentUpsertResult): void;
  teams(teams: LinearTeam[]): void;
  projects(projects: ProjectOutput[]): void;
  project(project: ProjectOutput): void;
  states(states: LinearWorkflowState[]): void;
  labels(labels: LinearLabel[]): void;
  error(message: string): void;
}

export type OutputMode = 'compact' | 'json';

function hasValue(value: unknown): value is string | number {
  return value !== undefined && value !== null && value !== '';
}

function pushValue(parts: string[], value: unknown): void {
  if (hasValue(value)) {
    parts.push(String(value));
  }
}

function pushField(parts: string[], name: string, value: unknown): void {
  if (hasValue(value)) {
    parts.push(`${name}:${value}`);
  }
}

function printLines(lines: string[]): void {
  console.log(lines.length > 0 ? lines.join('\n') : 'no results');
}

function issueLabels(issue: IssueOutput): string {
  return issue.labels?.nodes
    ?.map((label) => (label.parent?.name ? `${label.parent.name}:${label.name}` : label.name))
    .filter(Boolean)
    .join(',') ?? '';
}

function issueTeam(issue: IssueOutput): string | undefined {
  return issue.team?.key || issue.team?.name;
}

function priorityLabel(priority: number | null | undefined): string | undefined {
  return priority === undefined || priority === null ? undefined : `P${priority}`;
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value));
}

export function printIssueList(issues: IssueOutput[]): void {
  printLines(issues.map((issue) => {
    const parts: string[] = [];
    pushValue(parts, issue.identifier);
    pushValue(parts, issue.state?.name);
    pushValue(parts, priorityLabel(issue.priority));
    pushValue(parts, issue.title);
    pushField(parts, 'assignee', issue.assignee?.name);
    pushField(parts, 'labels', issueLabels(issue));
    pushField(parts, 'url', issue.url);
    return parts.join(' | ');
  }).filter(Boolean));
}

export function printIssue(issue: IssueOutput): void {
  const headerParts: string[] = [];
  pushValue(headerParts, issue.identifier);
  pushValue(headerParts, issue.title);

  const lines = [headerParts.join(' | ')];
  pushField(lines, 'state', issue.state?.name);
  pushField(lines, 'team', issueTeam(issue));
  pushField(lines, 'priority', priorityLabel(issue.priority));
  pushField(lines, 'assignee', issue.assignee?.name);
  pushField(lines, 'labels', issueLabels(issue));
  pushField(lines, 'project', issue.project?.name);
  pushField(lines, 'url', issue.url);
  pushField(lines, 'description', issue.description);

  printLines(lines.filter(Boolean));
}

export function printComment(comment: CommentOutput): void {
  const headerParts: string[] = [];
  pushField(headerParts, 'comment', comment.id);
  pushField(headerParts, 'created', comment.createdAt);

  const lines = [headerParts.join(' | ')].filter(Boolean);
  pushField(lines, 'body', comment.body);
  printLines(lines);
}

export function printRelation(relation: RelationOutput): void {
  const parts: string[] = [];
  pushField(parts, 'relation', relation.id);
  pushField(parts, 'type', relation.type);
  pushField(parts, 'issue', relation.issue?.identifier);
  pushField(parts, 'related', relation.relatedIssue?.identifier);
  printLines([parts.join(' | ')].filter(Boolean));
}

export function printDocumentUpsert(result: LinearIssueDocumentUpsertResult): void {
  const parts: string[] = [];
  pushValue(parts, result.identifier);
  pushField(parts, 'document', result.documentTitle);
  pushField(parts, 'action', result.action);
  pushField(parts, 'url', result.documentUrl);
  printLines([parts.join(' | ')].filter(Boolean));
}

export function printTeams(teams: LinearTeam[]): void {
  printLines(teams.map((team) => {
    const parts: string[] = [];
    pushValue(parts, team.key);
    pushValue(parts, team.name);
    pushField(parts, 'id', team.id);
    return parts.join(' | ');
  }));
}

export function printProjects(projects: ProjectOutput[]): void {
  printLines(projects.map((project) => {
    const parts: string[] = [];
    const teamIds = project.teamIds ?? project.teams?.nodes.map((team) => team.id) ?? [];
    pushValue(parts, project.name);
    pushField(parts, 'state', project.state);
    pushField(parts, 'status', project.status?.name);
    pushField(parts, 'priority', priorityLabel(project.priority));
    pushField(parts, 'teams', teamIds.join(','));
    return parts.join(' | ');
  }));
}

export function printProject(project: ProjectOutput): void {
  const teamIds = project.teamIds ?? project.teams?.nodes.map((team) => team.id) ?? [];
  const lines = [project.name];
  pushField(lines, 'id', project.id);
  pushField(lines, 'state', project.state);
  pushField(lines, 'status', project.status?.name);
  pushField(lines, 'priority', priorityLabel(project.priority));
  pushField(lines, 'teams', teamIds.join(','));
  pushField(lines, 'description', project.description);
  pushField(lines, 'content', project.content);
  printLines(lines.filter(Boolean));
}

export function printStates(states: LinearWorkflowState[]): void {
  printLines(states.map((state) => {
    const parts: string[] = [];
    pushValue(parts, state.name);
    pushField(parts, 'type', state.type);
    pushField(parts, 'position', state.position);
    pushField(parts, 'id', state.id);
    return parts.join(' | ');
  }));
}

export function printLabels(labels: LinearLabel[]): void {
  printLines(labels.map((label) => {
    const parts: string[] = [];
    pushValue(parts, label.name);
    pushField(parts, 'color', label.color);
    pushField(parts, 'id', label.id);
    return parts.join(' | ');
  }));
}

export const compactFormatter: OutputFormatter = {
  issueList: printIssueList,
  issue: printIssue,
  comment: printComment,
  relation: printRelation,
  documentUpsert: printDocumentUpsert,
  teams: printTeams,
  projects: printProjects,
  project: printProject,
  states: printStates,
  labels: printLabels,
  error(message: string) {
    console.error(`error: ${message}`);
  },
};

export const jsonFormatter: OutputFormatter = {
  issueList: printJson,
  issue: printJson,
  comment: printJson,
  relation: printJson,
  documentUpsert: printJson,
  teams: printJson,
  projects: printJson,
  project: printJson,
  states: printJson,
  labels: printJson,
  error(message: string) {
    console.error(JSON.stringify({ error: message }));
  },
};

export function createOutputFormatter(mode: OutputMode): OutputFormatter {
  return mode === 'json' ? jsonFormatter : compactFormatter;
}
