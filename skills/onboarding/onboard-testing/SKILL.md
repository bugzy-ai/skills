---
name: bugzy-onboard-testing
description: Run the end-to-end onboarding workflow from exploration through plan, cases, automation, validation, test execution, triage, and reporting. Use for new projects.
---

# Onboard Testing

## When to use

Use when Bugzy needs to establish useful test coverage for a new project or major area from scratch. Deprecated full-test-coverage requests map here.

## Source basis

Derived from `packages/bugzy/src/tasks/library/onboard-testing.ts` and the exploration, planning, generation, mutation-validation, execution, triage, and reporting steps.

## Workflow

1. Complete phases in order: setup, exploration, test planning, case generation, automation, mutation validation, execution, triage, and reporting.
2. Gather available docs and project context, then explore the app to discover workflows and risk areas.
3. Generate a concise risk-based living test plan and extract non-secret environment variable names into `.env.testdata`.
4. Create manual cases, automate appropriate coverage, and add cleanup fixtures for tests that create data.
5. Run mutation validation using network-response faults and record the mutation report.
6. Run the automated suite, parse results, classify failures, repair test issues, and document product bugs.
7. Update knowledge with durable conventions and return a final onboarding report including coverage, mutation score, pass/fail counts, bugs, and recommended next work.
