---
name: bugzy-run-tests
description: Run automated tests, normalize results, triage failures, fix test issues, and report product bugs. Use for executing existing coverage.
---

# Run Tests

## When to use

Use when a user asks to run all tests, a tagged suite, a specific test file, or a focused set of automated checks.

## Source basis

Derived from `packages/bugzy/src/tasks/library/run-tests.ts`, test-strategy, execution, normalization, parsing, triage, fix, bug-logging, and notification steps.

## Workflow

1. Read `./tests/CLAUDE.md` and project test strategy before selecting commands.
2. Parse the selector as a file, tag, exact path, explicit all-suite request, or broad pattern.
3. Proceed immediately for exact files, exact tags, or explicit all-suite requests. For broad patterns that match multiple files, return a blocked selection section instead of running an unintended suite.
4. Default to smoke coverage for fast validation when the user's wording permits it; use broader regression only when requested or justified by context.
5. Run tests with the project's configured command and capture structured results, traces, screenshots, and manifests.
6. Normalize external or framework-specific output, parse failures, and classify each as product bug, test issue, environment issue, or expected test adjustment.
7. Fix only test issues and verify by rerunning. Do not mask product bugs.
8. Record durable learnings and return a concise execution report with pass/fail/skip counts, artifacts, fixed tests, product bugs, and next steps.
