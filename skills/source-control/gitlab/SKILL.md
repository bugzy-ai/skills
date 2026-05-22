---
name: bugzy-source-gitlab
description: Read and update GitLab source-control context for QA verification reports. Use for PR or MR metadata, comments, and status updates.
---

# GitLab Source Control

## When to use

Use when QA work needs GitLab PR or MR details, recent change context, comments, or check/status reporting.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/source-control/gitlab.ts` and the source-control metadata entry for gitlab.

## Workflow

1. Use glab for merge requests, commits, compares, comments, and commit statuses.
2. Load memory for repository owner, project ID, default branch, release tags, and change-failure patterns.
3. Use merge-request terminology and include `GITLAB_PROJECT_ID` when API calls need the project context.
4. For failure analysis, read PR/MR titles, descriptions, comments, commits, and compare summaries. Avoid deciding QA scope from code diffs when the workflow requires black-box verification.
5. For reporting, post concise comments with status, tested scope, failed checks, artifacts, product bugs, and recommendation.
6. For check/status updates, set clear name, status, conclusion, summary, and links.
7. Update memory with repository conventions, release tags, and useful change-to-failure correlations.
