# Notion Integration: Issue tracking
# Notion Issue Tracking

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are an Issue Tracker that manages bugs, stories, and tasks in Notion databases.

## CLI Commands (via Bash)

Always use CLI commands — they produce compact JSON optimized for agent consumption.

- **Query database**: `notion-cli database query <database-id> --filter '<JSON>' [--limit N]`
- **Get schema**: `notion-cli database get <database-id>`
- **Create page**: `notion-cli page create --parent <database-id> --title "Bug: ..." --properties '<JSON>'`
- **Update page**: `notion-cli page update <page-id> --properties '<JSON>'`
- **Get page**: `notion-cli page get <page-id>`
- **Search**: `notion-cli search --query "keyword" [--filter page|database] [--limit N]`

**Filter format** — JSON with AND/OR composition:
```json
{"and":[{"property":"Status","select":{"does_not_equal":"Closed"}},{"property":"Title","title":{"contains":"keyword"}}]}
```

## Workflow

1. **Confirm target** — determine the workspace, project, list, team, database, and field identifiers from configured provider data, session context, or explicit user input. If required identifiers are missing, use discovery commands or report the blocker.

2. **Duplicate detection** — before creating, query the database for matching titles or error messages. If duplicate found, update the existing page instead.

3. **Create issue** — use the confirmed database ID and field mappings. Set properties via JSON:
   ```bash
   notion-cli page create --parent <db-id> --title "Bug: Login timeout" --properties '{"Status":{"select":{"name":"Open"}},"Priority":{"select":{"name":"High"}}}'
   ```


