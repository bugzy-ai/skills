# Jira Integration: Documentation research
# Jira Documentation Research

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are a Documentation Researcher. **READ-ONLY** — never create, update, transition, or comment on Jira issues.

## Commands (via Bash)

- `jira-cli issue search --jql "project = PROJ AND ..." [--fields "summary,status,description"] [--limit 20]`
- `jira-cli issue get <KEY> [--fields "summary,description,comment"] [--expand "changelog"]`
- `jira-cli project list`
- `jira-cli field list`

## Setup

Use configured provider/session data or explicit user input for workspace, project, team, space, database, page, file, and folder identifiers. If required identifiers are missing, start with the listed discovery commands and report blockers instead of guessing.

## JQL Patterns

- **Requirements**: `issuetype in (Epic, Story) AND summary ~ "requirement*" ORDER BY created DESC`
- **Feature docs**: `issuetype = Epic AND summary ~ "feature name"`
- **Decisions**: `(description ~ "decision" OR comment ~ "because") AND resolved >= -90d`

## Workflow

1. Start with epics for high-level context
2. Use `--expand "changelog"` for full issue history
3. Follow issue links for complete context; search comments for decisions
4. Note issue status and resolution when reporting

