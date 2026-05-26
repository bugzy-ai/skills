#!/usr/bin/env node
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/cli.ts
var cli_exports = {};
module.exports = __toCommonJS(cli_exports);

// src/commands/issue.ts
var import_promises = require("fs/promises");

// src/graphql-client.ts
var LINEAR_API_URL = "https://api.linear.app/graphql";
function getApiKey() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LINEAR_API_KEY environment variable is required. Set it to your Linear API key or OAuth token."
    );
  }
  return apiKey;
}
async function query(queryString, variables) {
  const apiKey = getApiKey();
  const response = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey
    },
    body: JSON.stringify({ query: queryString, variables })
  });
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        `Linear API rate limit exceeded (429). Please wait before retrying.`
      );
    }
    const text = await response.text();
    throw new Error(`Linear API error ${response.status}: ${text}`);
  }
  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    const messages = json.errors.map((e) => e.message).join("; ");
    throw new Error(`Linear GraphQL error: ${messages}`);
  }
  if (!json.data) {
    throw new Error("Linear API returned empty data");
  }
  return json.data;
}

// src/output.ts
function hasValue(value) {
  return value !== void 0 && value !== null && value !== "";
}
function pushValue(parts, value) {
  if (hasValue(value)) {
    parts.push(String(value));
  }
}
function pushField(parts, name, value) {
  if (hasValue(value)) {
    parts.push(`${name}:${value}`);
  }
}
function printLines(lines) {
  console.log(lines.length > 0 ? lines.join("\n") : "no results");
}
function issueLabels(issue) {
  return issue.labels?.nodes?.map((label) => label.parent?.name ? `${label.parent.name}:${label.name}` : label.name).filter(Boolean).join(",") ?? "";
}
function issueTeam(issue) {
  return issue.team?.key || issue.team?.name;
}
function priorityLabel(priority) {
  return priority === void 0 || priority === null ? void 0 : `P${priority}`;
}
function printJson(value) {
  console.log(JSON.stringify(value));
}
function printIssueList(issues) {
  printLines(issues.map((issue) => {
    const parts = [];
    pushValue(parts, issue.identifier);
    pushValue(parts, issue.state?.name);
    pushValue(parts, priorityLabel(issue.priority));
    pushValue(parts, issue.title);
    pushField(parts, "assignee", issue.assignee?.name);
    pushField(parts, "labels", issueLabels(issue));
    pushField(parts, "url", issue.url);
    return parts.join(" | ");
  }).filter(Boolean));
}
function printIssue(issue) {
  const headerParts = [];
  pushValue(headerParts, issue.identifier);
  pushValue(headerParts, issue.title);
  const lines = [headerParts.join(" | ")];
  pushField(lines, "state", issue.state?.name);
  pushField(lines, "team", issueTeam(issue));
  pushField(lines, "priority", priorityLabel(issue.priority));
  pushField(lines, "assignee", issue.assignee?.name);
  pushField(lines, "labels", issueLabels(issue));
  pushField(lines, "project", issue.project?.name);
  pushField(lines, "url", issue.url);
  pushField(lines, "description", issue.description);
  printLines(lines.filter(Boolean));
}
function printComment(comment) {
  const headerParts = [];
  pushField(headerParts, "comment", comment.id);
  pushField(headerParts, "created", comment.createdAt);
  const lines = [headerParts.join(" | ")].filter(Boolean);
  pushField(lines, "body", comment.body);
  printLines(lines);
}
function printRelation(relation) {
  const parts = [];
  pushField(parts, "relation", relation.id);
  pushField(parts, "type", relation.type);
  pushField(parts, "issue", relation.issue?.identifier);
  pushField(parts, "related", relation.relatedIssue?.identifier);
  printLines([parts.join(" | ")].filter(Boolean));
}
function printDocumentUpsert(result) {
  const parts = [];
  pushValue(parts, result.identifier);
  pushField(parts, "document", result.documentTitle);
  pushField(parts, "action", result.action);
  pushField(parts, "url", result.documentUrl);
  printLines([parts.join(" | ")].filter(Boolean));
}
function printTeams(teams) {
  printLines(teams.map((team) => {
    const parts = [];
    pushValue(parts, team.key);
    pushValue(parts, team.name);
    pushField(parts, "id", team.id);
    return parts.join(" | ");
  }));
}
function printProjects(projects) {
  printLines(projects.map((project) => {
    const parts = [];
    const teamIds = project.teamIds ?? project.teams?.nodes.map((team) => team.id) ?? [];
    pushValue(parts, project.name);
    pushField(parts, "state", project.state);
    pushField(parts, "status", project.status?.name);
    pushField(parts, "priority", priorityLabel(project.priority));
    pushField(parts, "teams", teamIds.join(","));
    return parts.join(" | ");
  }));
}
function printProject(project) {
  const teamIds = project.teamIds ?? project.teams?.nodes.map((team) => team.id) ?? [];
  const lines = [project.name];
  pushField(lines, "id", project.id);
  pushField(lines, "state", project.state);
  pushField(lines, "status", project.status?.name);
  pushField(lines, "priority", priorityLabel(project.priority));
  pushField(lines, "teams", teamIds.join(","));
  pushField(lines, "description", project.description);
  pushField(lines, "content", project.content);
  printLines(lines.filter(Boolean));
}
function printStates(states) {
  printLines(states.map((state) => {
    const parts = [];
    pushValue(parts, state.name);
    pushField(parts, "type", state.type);
    pushField(parts, "position", state.position);
    pushField(parts, "id", state.id);
    return parts.join(" | ");
  }));
}
function printLabels(labels) {
  printLines(labels.map((label) => {
    const parts = [];
    pushValue(parts, label.name);
    pushField(parts, "color", label.color);
    pushField(parts, "id", label.id);
    return parts.join(" | ");
  }));
}
var compactFormatter = {
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
  error(message) {
    console.error(`error: ${message}`);
  }
};
var jsonFormatter = {
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
  error(message) {
    console.error(JSON.stringify({ error: message }));
  }
};
function createOutputFormatter(mode) {
  return mode === "json" ? jsonFormatter : compactFormatter;
}

// src/commands/issue.ts
var DEFAULT_LIMIT = 50;
var ISSUE_FIELDS = `
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
var DOCUMENT_FIELDS = `
  id
  title
  content
  url
  createdAt
  updatedAt
`;
function parsePriorityFlag(value) {
  const asInt = Number(value);
  if (Number.isInteger(asInt) && asInt >= 0 && asInt <= 4) return asInt;
  throw new Error(`Invalid --priority "${value}". Use a Linear-native value from 0 to 4.`);
}
async function resolveTeamId(teamKey) {
  const data = await query(`
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
async function resolveStateId(stateName, teamId) {
  const data = await query(`
    query FindState($filter: WorkflowStateFilter) {
      workflowStates(filter: $filter) {
        nodes { id name }
      }
    }
  `, {
    filter: {
      team: { id: { eq: teamId } },
      name: { eqIgnoreCase: stateName }
    }
  });
  if (data.workflowStates.nodes.length === 0) {
    throw new Error(`Workflow state "${stateName}" not found for team`);
  }
  return data.workflowStates.nodes[0].id;
}
async function resolveLabelId(labelName, teamId) {
  const filter = {
    name: { eqIgnoreCase: labelName }
  };
  if (teamId) {
    filter.team = { id: { eq: teamId } };
  }
  const data = await query(`
    query FindLabel($filter: IssueLabelFilter) {
      issueLabels(filter: $filter) {
        nodes { id name }
      }
    }
  `, { filter });
  if (data.issueLabels.nodes.length === 0) {
    if (teamId) {
      return resolveLabelId(labelName);
    }
    throw new Error(`Label "${labelName}" not found`);
  }
  return data.issueLabels.nodes[0].id;
}
async function resolveLabelIds(names, teamId) {
  const seenNames = /* @__PURE__ */ new Set();
  const uniqueNames = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seenNames.has(lower)) continue;
    seenNames.add(lower);
    uniqueNames.push(name);
  }
  const ids = await Promise.all(uniqueNames.map((n) => resolveLabelId(n, teamId)));
  const seenIds = /* @__PURE__ */ new Set();
  return ids.filter((id) => {
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}
async function resolveProjectId(projectName) {
  const data = await query(`
    query FindProject($filter: ProjectFilter) {
      projects(filter: $filter) {
        nodes { id name }
      }
    }
  `, { filter: { name: { eqIgnoreCase: projectName } } });
  return data.projects.nodes.length === 0 ? null : data.projects.nodes[0].id;
}
async function resolveIssueId(identifier) {
  if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return identifier;
  }
  const data = await query(`
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
async function readDescription(description, descriptionFile, flagName) {
  if (description !== void 0 && descriptionFile !== void 0) {
    throw new Error(`Cannot pass both ${flagName} and ${flagName}-file. Choose one.`);
  }
  if (descriptionFile !== void 0) {
    return (0, import_promises.readFile)(descriptionFile, "utf8");
  }
  return description;
}
async function searchIssues(options, output = compactFormatter) {
  const limit = options.limit ? parseInt(options.limit, 10) : DEFAULT_LIMIT;
  const labelNames = options.labels?.length ? options.labels : options.label ? [options.label] : [];
  const filter = {};
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
    filter.and = labelNames.map((name) => ({
      labels: { some: { name: { eqIgnoreCase: name } } }
    }));
  }
  if (options.query) {
    const variables = {
      term: options.query,
      first: limit,
      includeComments: true
    };
    if (options.team) {
      const teamId = filter.team ? filter.team.id.eq : await resolveTeamId(options.team);
      variables.teamId = teamId;
      delete filter.team;
    }
    if (Object.keys(filter).length > 0) {
      variables.filter = filter;
    }
    const data = await query(`
      query SearchIssues($term: String!, $first: Int, $filter: IssueFilter, $teamId: String, $includeComments: Boolean) {
        searchIssues(term: $term, first: $first, filter: $filter, teamId: $teamId, includeComments: $includeComments) {
          nodes { ${ISSUE_FIELDS} }
        }
      }
    `, variables);
    output.issueList(data.searchIssues.nodes);
  } else {
    const data = await query(`
      query ListIssues($first: Int, $filter: IssueFilter) {
        issues(first: $first, filter: $filter) {
          nodes { ${ISSUE_FIELDS} }
        }
      }
    `, { first: limit, filter: Object.keys(filter).length > 0 ? filter : void 0 });
    output.issueList(data.issues.nodes);
  }
}
async function getIssue(identifier, output = compactFormatter) {
  if (!identifier) {
    throw new Error("Issue identifier is required (e.g., ENG-123 or UUID)");
  }
  const issueId = await resolveIssueId(identifier);
  const data = await query(`
    query GetIssue($id: String!) {
      issue(id: $id) {
        ${ISSUE_FIELDS}
      }
    }
  `, { id: issueId });
  output.issue(data.issue);
}
async function createIssue(options, output = compactFormatter) {
  if (!options.team) {
    throw new Error("--team is required for issue create");
  }
  if (!options.title) {
    throw new Error("--title is required for issue create");
  }
  const teamId = await resolveTeamId(options.team);
  const description = await readDescription(options.description, options.descriptionFile, "--description");
  const labelNames = options.labels?.length ? options.labels : options.label ? [options.label] : [];
  const input = {
    teamId,
    title: options.title
  };
  if (description !== void 0) {
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
  const data = await query(`
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { ${ISSUE_FIELDS} }
      }
    }
  `, { input });
  output.issue(data.issueCreate.issue);
}
async function updateIssue(identifier, options, output = compactFormatter) {
  if (!identifier) {
    throw new Error("Issue identifier is required (e.g., ENG-123 or UUID)");
  }
  const issueId = await resolveIssueId(identifier);
  const input = {};
  let cachedTeamId;
  async function getTeamId() {
    if (cachedTeamId) return cachedTeamId;
    const issueData = await query(`
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
    const userData = await query(`
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
  const description = await readDescription(options.description, options.descriptionFile, "--description");
  if (description !== void 0) {
    input.description = description;
  }
  const labelNames = options.labels?.length ? options.labels : options.label ? [options.label] : [];
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
    throw new Error("No update options provided");
  }
  const data = await query(`
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        issue { ${ISSUE_FIELDS} }
      }
    }
  `, { id: issueId, input });
  output.issue(data.issueUpdate.issue);
}
async function documentUpsertIssue(identifier, options, output = compactFormatter) {
  if (!identifier) {
    throw new Error("Issue identifier is required (e.g., ENG-123 or UUID)");
  }
  if (!options.title) {
    throw new Error("--title is required for issue document-upsert");
  }
  if (!options.contentFile) {
    throw new Error("--content-file is required for issue document-upsert");
  }
  const content = await (0, import_promises.readFile)(options.contentFile, "utf8");
  const issueId = await resolveIssueId(identifier);
  const issueData = await query(`
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
  const matches = issueData.issue.documents.nodes.filter((document2) => document2.title === options.title);
  if (matches.length > 1) {
    throw new Error(`Found ${matches.length} documents titled "${options.title}" on ${issueData.issue.identifier}. Delete duplicates before upserting.`);
  }
  let action;
  let document;
  if (matches.length === 0) {
    const data = await query(`
      mutation CreateDocument($input: DocumentCreateInput!) {
        documentCreate(input: $input) {
          document { ${DOCUMENT_FIELDS} }
        }
      }
    `, { input: { issueId: issueData.issue.id, title: options.title, content } });
    action = "created";
    document = data.documentCreate.document;
  } else {
    const data = await query(`
      mutation UpdateDocument($id: String!, $input: DocumentUpdateInput!) {
        documentUpdate(id: $id, input: $input) {
          document { ${DOCUMENT_FIELDS} }
        }
      }
    `, { id: matches[0].id, input: { title: options.title, content } });
    action = "updated";
    document = data.documentUpdate.document;
  }
  output.documentUpsert({
    identifier: issueData.issue.identifier,
    action,
    documentTitle: document.title,
    documentUrl: document.url,
    document
  });
}
async function commentIssue(identifier, options, output = compactFormatter) {
  if (!identifier) {
    throw new Error("Issue identifier is required (e.g., ENG-123 or UUID)");
  }
  const opts = typeof options === "string" ? { body: options } : options;
  const body = await readDescription(opts.body, opts.bodyFile, "--body");
  if (!body) {
    throw new Error("--body is required for issue comment (or use --body-file to read from a file)");
  }
  const issueId = await resolveIssueId(identifier);
  const data = await query(`
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
async function relateIssue(identifier, options, output = compactFormatter) {
  if (!identifier) {
    throw new Error("Issue identifier is required (e.g., ENG-123 or UUID)");
  }
  let type;
  let target;
  if (options.blocks && options.related) {
    throw new Error("Pass either --blocks or --related, not both.");
  } else if (options.blocks) {
    type = "blocks";
    target = options.blocks;
  } else if (options.related) {
    type = "related";
    target = options.related;
  } else {
    throw new Error("--blocks <id> or --related <id> is required for issue relate");
  }
  const [issueId, relatedIssueId] = await Promise.all([
    resolveIssueId(identifier),
    resolveIssueId(target)
  ]);
  const data = await query(`
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

// src/commands/team.ts
async function listTeams(output = compactFormatter) {
  const data = await query(`
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

// src/commands/project.ts
var PROJECT_FIELDS = `
  id
  name
  description
  content
  priority
  state
  status { id name type }
  teams { nodes { id key name } }
`;
async function resolveTeamId2(teamKey) {
  const data = await query(`
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
async function listProjects(teamKey, output = compactFormatter) {
  let filter;
  if (teamKey) {
    const teamId = await resolveTeamId2(teamKey);
    filter = { accessibleTeams: { some: { id: { eq: teamId } } } };
  }
  const data = await query(`
    query ListProjects($filter: ProjectFilter) {
      projects(filter: $filter) {
        nodes { ${PROJECT_FIELDS} }
      }
    }
  `, { filter });
  output.projects(data.projects.nodes.map(toProjectOutput));
}
async function getProject(nameOrId, output = compactFormatter) {
  if (!nameOrId) {
    throw new Error("Project name or ID is required");
  }
  const project = isUuid(nameOrId) ? await fetchProjectById(nameOrId) : await fetchProjectByName(nameOrId);
  if (!project) {
    throw new Error(`Project "${nameOrId}" not found`);
  }
  output.project(toProjectOutput(project));
}
async function fetchProjectById(id) {
  const data = await query(`
    query GetProject($id: String!) {
      project(id: $id) { ${PROJECT_FIELDS} }
    }
  `, { id });
  return data.project;
}
async function fetchProjectByName(name) {
  const data = await query(`
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
function toProjectOutput(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    content: project.content,
    priority: project.priority,
    state: project.state,
    status: project.status,
    teamIds: project.teams.nodes.map((team) => team.id)
  };
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// src/commands/state.ts
async function resolveTeamId3(teamKey) {
  const data = await query(`
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
async function listStates(teamKey, output = compactFormatter) {
  if (!teamKey) {
    throw new Error("--team is required for state list");
  }
  const teamId = await resolveTeamId3(teamKey);
  const data = await query(`
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

// src/commands/label.ts
async function resolveTeamId4(teamKey) {
  const data = await query(`
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
async function listLabels(teamKey, output = compactFormatter) {
  let filter;
  if (teamKey) {
    const teamId = await resolveTeamId4(teamKey);
    filter = { team: { id: { eq: teamId } } };
  }
  const data = await query(`
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

// src/cli.ts
function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      let value;
      if (next && !next.startsWith("--")) {
        value = next;
        i++;
      } else {
        value = "true";
      }
      const bucket = options[key] ?? (options[key] = []);
      bucket.push(value);
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}
function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function getOpt(options, ...keys) {
  for (const key of keys) {
    if (options[key]?.length) return options[key][0];
    const camel = camelCase(key);
    if (options[camel]?.length) return options[camel][0];
  }
  return void 0;
}
function getAll(options, ...keys) {
  const out = [];
  for (const key of keys) {
    if (options[key]?.length) out.push(...options[key]);
    const camel = camelCase(key);
    if (camel !== key && options[camel]?.length) out.push(...options[camel]);
  }
  return out;
}
var HELP = `linear-cli \u2014 Interact with Linear's GraphQL API

Usage:
  linear-cli <resource> <action> [options]

Resources & Actions:

  issue search    --query "text" [--team KEY] [--state "Name"] [--label "Name" ...] [--limit N]
  issue get       <identifier>        (e.g., ENG-123 or UUID)
  issue create    --team KEY --title "..." [--description "..." | --description-file path]
                  [--priority 0..4] [--label "Name" ...] [--state "Name"] [--project "Name"]
  issue update    <identifier> [--state "Name"] [--priority 0..4] [--assignee email]
                  [--title "..."] [--description "..." | --description-file path]
                  [--label "Name" ...] [--project "Name"]
  issue comment   <identifier> --body "..." | --body-file path
  issue document-upsert <identifier> --title "..." --content-file path
  issue relate    <identifier> --blocks <other> | --related <other>

  team list
  project list    [--team KEY]
  project get     <name-or-id>
  state list      --team KEY
  label list      [--team KEY]

Environment Variables:
  LINEAR_API_KEY    Linear API key or OAuth token (required)

Options:
  --json            Output raw JSON
  --help, -h        Show this help message

Notes:
  --priority accepts Linear-native values 0..4.
  --label is repeatable (--label A --label B --label C). Duplicates are de-duped
  by resolved label id. On 'issue update', labelIds REPLACES the issue's labels.`;
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
    return;
  }
  const { positional, options } = parseArgs(args);
  const resource = positional[0];
  const action = positional[1];
  const output = createOutputFormatter(getOpt(options, "json") === "true" ? "json" : "compact");
  if (action === "--help" || action === "-h" || getOpt(options, "help") === "true") {
    console.log(HELP);
    process.exit(0);
    return;
  }
  try {
    switch (resource) {
      case "issue":
        switch (action) {
          case "search":
            await searchIssues({
              query: getOpt(options, "query"),
              team: getOpt(options, "team"),
              state: getOpt(options, "state"),
              labels: getAll(options, "label"),
              limit: getOpt(options, "limit")
            }, output);
            break;
          case "get":
            await getIssue(positional[2], output);
            break;
          case "create":
            await createIssue({
              team: getOpt(options, "team") || "",
              title: getOpt(options, "title") || "",
              description: getOpt(options, "description"),
              descriptionFile: getOpt(options, "description-file"),
              priority: getOpt(options, "priority"),
              labels: getAll(options, "label"),
              state: getOpt(options, "state"),
              project: getOpt(options, "project")
            }, output);
            break;
          case "update":
            await updateIssue(positional[2], {
              state: getOpt(options, "state"),
              priority: getOpt(options, "priority"),
              assignee: getOpt(options, "assignee"),
              title: getOpt(options, "title"),
              description: getOpt(options, "description"),
              descriptionFile: getOpt(options, "description-file"),
              labels: getAll(options, "label"),
              project: getOpt(options, "project")
            }, output);
            break;
          case "comment":
            await commentIssue(positional[2], {
              body: getOpt(options, "body"),
              bodyFile: getOpt(options, "body-file")
            }, output);
            break;
          case "document-upsert":
            await documentUpsertIssue(positional[2], {
              title: getOpt(options, "title") || "",
              contentFile: getOpt(options, "content-file") || ""
            }, output);
            break;
          case "relate":
            await relateIssue(positional[2], {
              blocks: getOpt(options, "blocks"),
              related: getOpt(options, "related")
            }, output);
            break;
          default:
            output.error(`Unknown action: issue ${action || "(none)"}. Use --help for usage.`);
            process.exit(1);
        }
        break;
      case "team":
        if (action === "list") {
          await listTeams(output);
        } else {
          output.error(`Unknown action: team ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "project":
        if (action === "list") {
          await listProjects(getOpt(options, "team"), output);
        } else if (action === "get") {
          await getProject(positional[2], output);
        } else {
          output.error(`Unknown action: project ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "state":
        if (action === "list") {
          await listStates(getOpt(options, "team") || "", output);
        } else {
          output.error(`Unknown action: state ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      case "label":
        if (action === "list") {
          await listLabels(getOpt(options, "team"), output);
        } else {
          output.error(`Unknown action: label ${action || "(none)"}. Use --help for usage.`);
          process.exit(1);
        }
        break;
      default:
        output.error(`Unknown resource: ${resource}. Use --help for usage.`);
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.error(message);
    process.exit(1);
  }
}
main();
