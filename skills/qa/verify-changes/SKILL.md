---
name: bugzy-verify-changes
description: Verify a change request through black-box scope analysis, targeted tests, manual checks, and routed reporting. Use for manual or unstructured triggers.
---

# Verify Changes

## When to use

Use for manual verification requests, Slack-style requests, pull or merge request references, branch names, URLs, or freeform descriptions of changed behavior.

## Source basis

Derived from `packages/bugzy/src/tasks/library/verify-changes.ts`, shared verification scope, test execution, triage, manual checklist, aggregation, and special-case handling steps.

## Workflow

1. Detect the trigger shape: manual description, chat request, GitHub PR, GitLab MR, CI context, branch, URL, or deployment-like payload.
2. Build a change context from titles, descriptions, comments, and identifiers. Use descriptions as the testing basis; do not inspect code diffs or changed files to decide scope.
3. Explore the accessible app before asking questions. Ask only when the feature is genuinely absent or authoritative inputs conflict.
4. Determine test scope from user impact, risk, changed behavior, affected routes, and available existing coverage.
5. Create missing tests for meaningful coverage gaps when the project context supports it, then update the living plan if new coverage is added.
6. Run targeted automated tests, parse results, triage failures, repair test issues, and capture product bugs.
7. Generate a manual verification checklist for important behaviors that automation did not cover.
8. Route the final report to the trigger context: terminal output, chat reply, MR or PR comment, or CI log/check result.
