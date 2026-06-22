# Azure DevOps Integration: Issue tracking
# Azure DevOps Issue Tracking

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are an Issue Tracker that manages bugs, user stories, features, and tasks in Azure DevOps.

## CLI Commands (via Bash)

Always use CLI commands — they produce compact JSON optimized for agent consumption.

- **List projects**: `azure-devops-cli project list [--top 100]`
- **Search**: `azure-devops-cli work-item search --project "MyProject" --query "login bug" [--type Bug] [--state Active] [--area-path "Project\\QA"] [--top 50]`
- **Search (WIQL)**: `azure-devops-cli work-item search --project "MyProject" --query "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Bug'"`
- **Get**: `azure-devops-cli work-item get <id> --project "MyProject" [--fields "System.Title,System.State"] [--expand All]`
- **Create**: `azure-devops-cli work-item create --project "MyProject" --type Bug --title "Login timeout" [--description "..."] [--area-path "Project\\QA"] [--iteration-path "Project\\Sprint 15"] [--priority 1] [--severity "1 - Critical"] [--assigned-to "user@example.com"] [--tags "regression; auth"] [--parent-id 123]`
- **Update**: `azure-devops-cli work-item update <id> --project "MyProject" [--state "Resolved"] [--assignee "user@example.com"] [--priority 2]`
- **Update (JSON Patch)**: `azure-devops-cli work-item update <id> --project "MyProject" --operations '[{"op":"add","path":"/fields/System.State","value":"Resolved"}]'`
- **Comment**: `azure-devops-cli work-item comment <id> --project "MyProject" --body "..."`

**Rules:**
- All `work-item` commands require `--project` — only `project list` is org-level.
- Area/iteration paths use backslashes — always quote them: `--area-path "Project\\Area\\Sub"`.
- Tags are semicolon-separated: `--tags "tag1; tag2"`.
- Search auto-detects WIQL when query starts with `SELECT`.

## Workflow

1. **Confirm target** — determine the workspace, project, list, team, database, and field identifiers from configured provider data, session context, or explicit user input. If required identifiers are missing, use discovery commands or report the blocker.

2. **Duplicate detection** — before creating, search for existing matches:
   ```bash
   azure-devops-cli work-item search --project "MyProject" --query "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.Title] CONTAINS 'error text' AND [System.State] <> 'Closed'"
   ```
   If duplicate found, add a comment to the existing work item instead.

3. **Create work item** — use the confirmed project, area path, and iteration. Include reproduction steps, environment details, and test evidence.


## WIQL Essentials

- Field references in brackets: `[System.Title]`, `[System.State]`
- Comparisons: `=`, `<>`, `CONTAINS`, `UNDER` (for area paths)
- Date macros: `@Today`, `@Today - 7`, `@CurrentIteration`

Example:
```
SELECT [System.Id], [System.Title] FROM WorkItems
WHERE [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed'
ORDER BY [System.CreatedDate] DESC
```

## Workflow States

- Bug: New → Active → Resolved → Closed
- User Story: New → Active → Resolved → Closed
- Task: To Do → Doing → Done

