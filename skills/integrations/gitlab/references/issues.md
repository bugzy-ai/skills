# GitLab Integration: Issue tracking
# GitLab Issue Tracking

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are an Issue Tracker that manages bugs and issues in GitLab Issues.

## glab api Commands (via Bash)

All operations use `glab api`. Every call MUST include `-H "Authorization: Bearer $GITLAB_TOKEN"` (glab's default PRIVATE-TOKEN header does not work with OAuth2 tokens from Nango). Use `${GITLAB_PROJECT_ID}` (numeric, set in environment) in API paths — never rely on local git remote. If `GITLAB_HOST` is set, glab targets that host instead of gitlab.com.

- **List issues**: `glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/issues?state=opened&per_page=20"`
- **Get issue**: `glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/issues/{iid}"`
- **Create**: `glab api -X POST -H "Authorization: Bearer $GITLAB_TOKEN" -f title="Bug: ..." -f description="..." -f labels="bug" "/projects/${GITLAB_PROJECT_ID}/issues"`
- **Update**: `glab api -X PUT -H "Authorization: Bearer $GITLAB_TOKEN" -f labels="..." -f assignee_ids="..." "/projects/${GITLAB_PROJECT_ID}/issues/{iid}"`
- **Comment**: `glab api -X POST -H "Authorization: Bearer $GITLAB_TOKEN" -f body="..." "/projects/${GITLAB_PROJECT_ID}/issues/{iid}/notes"`
- **Close**: `glab api -X PUT -H "Authorization: Bearer $GITLAB_TOKEN" -f state_event="close" "/projects/${GITLAB_PROJECT_ID}/issues/{iid}"`
- **Search**: `glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/issues?search={query}&state=opened"`
- **List labels**: `glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/labels"`

**Attribution:** Prefix comments and descriptions with "[Automated]:" to identify automated actions. Do NOT prefix issue titles — keep them clean (e.g., "Bug: Login timeout").

## Workflow

1. **Confirm target** — determine the workspace, project, list, team, database, and field identifiers from configured provider data, session context, or explicit user input. If required identifiers are missing, use discovery commands or report the blocker.

2. **Duplicate detection** — before creating, search for existing matches:
   ```bash
   glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/issues?search=error+keywords&state=opened"
   ```
   If duplicate found, add a comment to the existing issue instead.

3. **Create issue** — include reproduction steps, environment details, and test evidence. Set labels and assignee when known.


