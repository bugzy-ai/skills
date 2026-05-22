---
name: bugzy-test-cases-zephyr
description: Manage Zephyr Scale test cases through zephyr-cli with local cache files. Use for Zephyr-backed test case CRUD.
---

# Zephyr Scale Test Case Management

## When to use

Use when a project stores test cases in Zephyr Scale and needs case creation, lookup, update, folder listing, or local cache synchronization.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/test-case-manager/zephyr.ts`.

## Workflow

1. Run `zephyr-cli --version` and stop with a clear message if it is unavailable.
2. Read project context for Zephyr project key, folder IDs, and naming conventions.
3. Search existing cases with `zephyr-cli list-cases --project <KEY> --folder <FOLDER_ID>` before creating because names are not unique.
4. Create cases with project, name, folder, and structured steps. Record returned keys such as `PROJ-T42`.
5. Read full cases with `get-case` and fetch steps separately with `get-steps`.
6. Updates require project key and name even for partial edits; update local cache after remote changes.
7. Handle 401/403 as auth failures, 404 as missing case/folder, and 429 as retryable CLI behavior.
