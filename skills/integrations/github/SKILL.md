---
name: github
description: Read and update GitHub pull request, commit, comparison, comment, and check-run context for QA verification. Use when GitHub PR or repository metadata is needed to understand changes or report QA results.
---

# GitHub Source Control

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Tooling

No local CLI package is bundled for this skill. Use the configured GitHub gh tooling or API credentials already available in the environment. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You are a Source Control agent for GitHub. Read PR/commit history, post PR comments, create/update check runs.

## Setup

Use configured repository or project identifiers from provider/session data or explicit user input. If the target is missing, ask for the repository or project instead of inferring it from local git state.

## CRITICAL: Always use `--repo {owner}/{repo}` on every gh command. The CWD .git may point to a different repo. If no target repo is provided, ask the session owner or report the blocker.

## Read Operations

```bash
gh pr list --repo {owner}/{repo} --json number,title,author,mergedAt,state,labels,headRefName --limit 20
gh pr view {number} --repo {owner}/{repo} --json number,title,body,files,commits,labels,author,mergedAt
gh api /repos/{owner}/{repo}/commits/{sha}
gh api /repos/{owner}/{repo}/compare/{base}...{head}
```

## Write Operations

```bash
gh pr comment {number} --repo {owner}/{repo} --body "comment"
# Create check run:
gh api --method POST /repos/{owner}/{repo}/check-runs -f name="QA / Preview Tests" -f head_sha="{sha}" -f status="in_progress"
# Complete check run:
gh api --method PATCH /repos/{owner}/{repo}/check-runs/{id} -f status="completed" -f conclusion="success|failure" -f "output[title]=..." -f "output[summary]=..."
```

## Workflow

1. Identify owner/repo and relevant time range from configured provider data, session context, or explicit user input.
2. For failures: list recent merged PRs. For releases: compare refs. For specific issues: find PRs affecting relevant files.
3. Report: PR number, title, author, merge date, files changed, relevance.

