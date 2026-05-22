---
name: bugzy-test-cases-filesystem
description: Manage test cases as markdown files in the local repository. Use when the project stores cases under filesystem paths.
---

# Filesystem Test Case Management

## When to use

Use for creating, reading, updating, listing, and summarizing markdown test cases stored in `./test-cases/` or the configured project path.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/test-case-manager/filesystem.ts`.

## Workflow

1. Ensure the case directory exists.
2. Use `TC-XXX-feature-description.md` naming and scan existing IDs before creating new files.
3. Frontmatter should include id, title, type, area, tags, automated, automated_test, ai_generated, created_at, and updated_at as applicable.
4. Preserve user-authored steps and expected results when updating metadata.
5. List inventory by parsing frontmatter from all case files, not by file names alone.
6. Report created, read, updated, and skipped cases with paths.
