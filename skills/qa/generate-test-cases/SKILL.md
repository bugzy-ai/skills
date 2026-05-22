---
name: bugzy-generate-test-cases
description: Turn a test plan into manual test cases, automated tests, validation artifacts, and coverage updates. Use after a test plan exists.
---

# Generate Test Cases

## When to use

Use when a project needs manual test-case markdown, automated Playwright coverage, or updates to cases and tests from an existing plan or feedback.

## Source basis

Derived from `packages/bugzy/src/tasks/library/generate-test-cases.ts`, generation steps, mutation validation, artifact validation, and knowledge-base maintenance steps.

## Workflow

1. Read `test-plan.md`, testing conventions, existing cases, existing automated tests, and safety constraints.
2. Apply account-aware scope: trial projects receive the highest-priority three cases; paid projects receive the requested full coverage.
3. Organize scenarios by feature area and category: critical paths, happy paths, error handling, edge cases, and API coverage.
4. Create all manual case documents before automation. Include frontmatter, clear steps, expected results, test data references, and `ai_generated: true`.
5. Cross-reference exploration findings and avoid duplicate cases or overlapping automated specs.
6. Automate area by area using existing project conventions. Explore live UI before choosing selectors, add Bugzy attribution to generated files, update each case with its automated test path, and keep API cases in API-oriented specs.
7. Generate cleanup fixtures for data-creating tests, then run mutation validation with network-response faults and write `test-runs/{timestamp}/mutation-report.json`.
8. Update the living test plan with covered features and case IDs, extract non-secret env names to `.env.testdata`, validate artifacts, update knowledge, and report manual counts, automated counts, mutation score, and run command.
