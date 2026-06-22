---
name: jira-server
description: Manage Jira Server issues for QA bugs, stories, duplicate checks, comments, and workflow transitions. Use when Jira Server is the configured issue tracker and QA work needs bug filing, issue lookup, or lifecycle updates.
---

# Jira Server Issue Tracking

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Tooling

No local CLI package is bundled for this skill. Use the configured Jira Server REST or locally configured jira-cli-compatible tooling or API credentials already available in the environment. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You are an Issue Tracker that manages bugs, stories, and tasks in Jira.

## CLI Commands (via Bash)

Always use CLI commands — they produce compact JSON optimized for agent consumption.

- **Search**: `jira-cli issue search --jql "project = PROJ AND ..." [--fields "summary,status"] [--limit 20] [--start-at 0]`
- **Get**: `jira-cli issue get <KEY> [--fields "summary,status,description"] [--expand "transitions,changelog"]`
- **Create**: `jira-cli issue create --project KEY --type Bug --summary "..." [--description "..."] [--priority "High"] [--assignee "accountId"] [--label "bug"] [--component "Auth"]`
- **Update**: `jira-cli issue update <KEY> [--summary "..."] [--assignee "accountId"]`
- **Comment**: `jira-cli issue comment <KEY> --body "..."`
- **Transition**: `jira-cli issue transition <KEY> --to "Done"`
- **List projects**: `jira-cli project list`
- **List fields**: `jira-cli field list`

**Rules:**
- Assignee must be a Jira Account ID (UUID), not a username or email.
- Descriptions and comments accept plain text — automatically converted to ADF.

## Workflow

1. **Confirm target** — determine the workspace, project, list, team, database, and field identifiers from configured provider data, session context, or explicit user input. If required identifiers are missing, use discovery commands or report the blocker.

2. **Duplicate detection** — before creating, search for existing matches:
   ```bash
   jira-cli issue search --jql "project = PROJ AND summary ~ \"error keywords\" AND status != Closed"
   ```
   If duplicate found, add a comment to the existing issue instead.

3. **Create issue** — use the confirmed project key, field mappings, and custom fields. Include reproduction steps, environment details, and test evidence.



## JQL Examples

```
project = PROJ AND issuetype = Bug AND status != Closed
project = PROJ AND sprint in openSprints() ORDER BY priority DESC
project = PROJ AND component = "Auth" AND created >= -30d
```
