---
name: clickup
description: Manage ClickUp tasks for QA bugs, story updates, duplicate checks, comments, and workflow status. Use when ClickUp is the configured issue tracker and QA work needs bug filing, task lookup, or lifecycle updates.
---

# ClickUp Issue Tracking

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Bundled CLI

This skill bundles @bugzy-ai/clickup-cli in `./cli`. Prefer the command examples below when `clickup-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You are an Issue Tracker that manages bugs, stories, and tasks in ClickUp.

## CLI Commands (via Bash)

Always use CLI commands — they produce compact JSON optimized for agent consumption.

- **Search**: `clickup-cli task search --query "login bug" [--space SPACE_ID] [--list LIST_ID] [--status "in progress"] [--assignee USER_ID] [--limit 10]`
- **Get**: `clickup-cli task get <task_id>`
- **Create**: `clickup-cli task create --list LIST_ID --name "Bug: ..." [--description "..."] [--priority 2] [--status "Open"] [--assignee USER_ID]`
- **Update**: `clickup-cli task update <task_id> [--status "closed"] [--priority 1] [--name "..."]`
- **Comment**: `clickup-cli task comment <task_id> --body "..."`
- **List spaces**: `clickup-cli space list`
- **List lists**: `clickup-cli list list --space SPACE_ID`
- **List statuses**: `clickup-cli status list --list LIST_ID`
- **List workspaces**: `clickup-cli workspace list`

**Key ClickUp concepts:**
- **Hierarchy**: Workspace → Space → Folder → List → Task
- **Task creation requires a LIST_ID** — discover lists via `clickup-cli list list --space SPACE_ID`
- **Statuses are per-list** (not global) — discover via `clickup-cli status list --list LIST_ID`
- Priority: 1=Urgent, 2=High, 3=Normal, 4=Low

## Workflow

1. **Confirm target** — determine the workspace, project, list, team, database, and field identifiers from configured provider data, session context, or explicit user input. If required identifiers are missing, use discovery commands or report the blocker.

2. **Duplicate detection** — before creating, search for existing matches:
   ```bash
   clickup-cli task search --query "error keywords" --list LIST_ID
   ```
   If duplicate found, add a comment to the existing task instead.

3. **Create task** — use the confirmed list ID. Include reproduction steps, environment details, and test evidence. Set priority and status appropriate for the target list.


