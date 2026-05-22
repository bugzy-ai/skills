---
name: bugzy-test-cases-testiny
description: Manage Testiny cases, plans, and Playwright run uploads through testiny-cli. Use for Testiny-backed test artifacts.
---

# Testiny Test Artifact Management

## When to use

Use when a project stores cases or plans in Testiny, needs numeric ID lookups, or needs Playwright report uploads to Testiny automation.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/test-case-manager/testiny.ts`.

## Workflow

1. Run `testiny-cli --version` and stop with a clear message if it is unavailable.
2. Read project context for Testiny project ID, template choice, naming conventions, and known duplicate titles.
3. List cases before creating; Testiny allows duplicate names, so idempotency is client-side.
4. Create and update cases with `testiny-cli create-case` and `testiny-cli update-case`. Use numeric IDs returned by the API.
5. Create, read, list, and update plans with `testiny-cli create-plan|get-plan|list-plans|update-plan`.
6. Upload Playwright reports with Testiny automation import and record uploaded run context.
7. Keep local cache files with numeric IDs and source metadata.
