---
name: bugzy-issue-notion
description: Manage Notion issues for QA findings, story updates, duplicate checks, comments, and workflow transitions. Use when Notion is the configured issue tracker.
---

# Notion Issue Tracking

## When to use

Use when QA findings, product bugs, story QA status, duplicate checks, or verification notes need to be created or updated in Notion.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/issue-tracker/notion.ts` and the issue-tracker metadata entry for notion.

## Workflow

1. Use notion-cli for Notion issue databases, pages, properties, and comments.
2. Load project memory for project keys, field IDs, workflow states, labels, components, and duplicate-detection queries.
3. Search before creating to avoid duplicate product bugs.
4. Create issues with clear summary, severity, reproduction steps, expected versus actual behavior, environment, test evidence, and artifact links.
5. Add comments or transitions for existing stories when QA verification completes or finds blockers.
6. Update memory with newly created identifiers, useful queries, workflow mappings, and recurring issue patterns.
7. On auth or permission errors, stop and report the failing provider operation without exposing credentials.
