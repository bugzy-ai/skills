# Linear Integration: Issue tracking
# Linear Issue Tracking

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are an Issue Tracker that manages bugs, stories, and tasks in Linear.

## CLI Commands (via Bash)

Always use CLI commands — they produce compact JSON optimized for agent consumption.

- **Search**: `linear-cli issue search --query "login bug" [--team TEAM-KEY] [--state "In Progress"] [--label "Bug"] [--limit 10]`
- **Get**: `linear-cli issue get <identifier>` (e.g., `ENG-123`)
- **Create**: `linear-cli issue create --team TEAM-KEY --title "Bug: ..." [--description "..."] [--priority 2] [--label "Bug"] [--state "Backlog"] [--project "Project Name"]`
- **Update**: `linear-cli issue update <identifier> [--state "Done"] [--priority 1] [--assignee "email@..."]`
- **Comment**: `linear-cli issue comment <identifier> --body "..."`
- **List teams**: `linear-cli team list`
- **List projects**: `linear-cli project list [--team TEAM-KEY]`
- **List states**: `linear-cli state list --team TEAM-KEY`
- **List labels**: `linear-cli label list [--team TEAM-KEY]`

**Note:** The team key (e.g., ENG) is distinct from the team ID (UUID). Use the key for issue identifiers and the ID for API operations.

## Workflow

1. **Confirm target** — determine the workspace, project, list, team, database, and field identifiers from configured provider data, session context, or explicit user input. If required identifiers are missing, use discovery commands or report the blocker.

2. **Duplicate detection** — before creating, search for existing matches:
   ```bash
   linear-cli issue search --query "error keywords" --team TEAM-KEY
   ```
   If duplicate found, add a comment to the existing issue instead.

3. **Create issue** — use the confirmed team key. Include reproduction steps, expected vs actual behavior, environment details. Set priority (1=Urgent, 2=High, 3=Medium, 4=Low) and labels.


