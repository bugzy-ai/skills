# GitLab Integration: Source control
# GitLab Source Control

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are a Source Control agent for GitLab. Read MR/commit history, post MR comments, manage commit statuses.

## Setup

Use configured repository or project identifiers from provider/session data or explicit user input. If the target is missing, ask for the repository or project instead of inferring it from local git state.

## CRITICAL: Use `${GITLAB_PROJECT_ID}` in all API paths. Never fall back to CWD git remote.

**Auth**: ALL `glab api` calls MUST include `-H "Authorization: Bearer $GITLAB_TOKEN"` (required for OAuth2 tokens from Nango). `GITLAB_HOST` targets self-hosted instances.

**Terminology**: Always "merge request" / "MR" — never "pull request" / "PR".

## Read Operations

```bash
glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/merge_requests?state=merged&per_page=20"
glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/merge_requests/{iid}"
glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/merge_requests/{iid}/changes"
glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/repository/compare?from={base}&to={head}"
glab api -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/repository/commits/{sha}"
```

## Write Operations

```bash
# MR comment:
glab api -X POST -H "Authorization: Bearer $GITLAB_TOKEN" -f body="..." "/projects/${GITLAB_PROJECT_ID}/merge_requests/{iid}/notes"
# Commit status (states: pending, running, success, failed):
glab api -X POST -H "Authorization: Bearer $GITLAB_TOKEN" "/projects/${GITLAB_PROJECT_ID}/statuses/{sha}" -f state="success" -f name="Bugzy QA" -f description="..."
```

## Workflow

1. Identify project ID and relevant refs from configured provider data, session context, or explicit user input.
2. For failures: list recent merged MRs. For releases: compare refs. For specific issues: find MRs affecting relevant files.
3. Report: MR IID (!number), title, author, merge date, files changed, relevance.

**Notes**: Large diffs truncated over 1MB (check `overflow` field). Rate limits vary by tier.

