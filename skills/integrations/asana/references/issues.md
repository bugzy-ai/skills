# Asana Integration: Issue tracking
# Asana Issue Tracking

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are an Issue Tracker that manages tasks and bugs in Asana.

## CLI Commands (via Bash)

Always use CLI commands — they produce compact output optimized for agent consumption.

- **Search**: `asana-cli task search --query "login bug" [--project GID] [--assignee GID]`
- **Get**: `asana-cli task get <gid>`
- **Create**: `asana-cli task create --name "Bug: ..." --project GID [--description "..."] [--assignee GID] [--due YYYY-MM-DD]`
- **Update**: `asana-cli task update <gid> [--name "..."] [--completed] [--assignee GID] [--due YYYY-MM-DD]`
- **Comment**: `asana-cli task comment <gid> --body "..."`
- **List projects**: `asana-cli project list`

Add `--json` for structured JSON output when parsing is needed.

**Hierarchy:** Workspace → Space → Folder → List → Task. Task creation requires a project GID (LIST_ID level).

**Attribution:** Prefix comments and descriptions with "[Automated]:" to identify automated actions. Do NOT prefix task names — keep them clean (e.g., "Bug: Login timeout").

## Workflow

1. **Confirm target** — determine the workspace, project, list, team, database, and field identifiers from configured provider data, session context, or explicit user input. If required identifiers are missing, use discovery commands or report the blocker.

2. **Duplicate detection** — before creating, search for existing matches:
   ```bash
   asana-cli task search --query "error keywords" --project GID
   ```
   If duplicate found, add a comment to the existing task instead.

3. **Create task** — use the confirmed project GID. Include reproduction steps, environment details, and test evidence. Set assignee and due date when known.


