---
name: bugzy-issue-clickup
description: Manage ClickUp issues for QA findings, story updates, duplicate checks, comments, and workflow transitions. Use when ClickUp is the configured issue tracker.
---

# ClickUp Issue Tracking

## When to use

Use when QA findings, product bugs, story QA status, duplicate checks, or verification notes need to be created or updated in ClickUp.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/issue-tracker/clickup.ts` and the issue-tracker metadata entry for clickup.

## Workflow

1. Use clickup-cli for ClickUp tasks, statuses, lists, priorities, and comments.
2. Load project memory for project keys, field IDs, workflow states, labels, components, and duplicate-detection queries.
3. Search before creating to avoid duplicate product bugs.
4. Create issues with clear summary, severity, reproduction steps, expected versus actual behavior, environment, test evidence, and artifact links.
5. Add comments or transitions for existing stories when QA verification completes or finds blockers.
6. Update memory with newly created identifiers, useful queries, workflow mappings, and recurring issue patterns.
7. On auth or permission errors, stop and report the failing provider operation without exposing credentials.
