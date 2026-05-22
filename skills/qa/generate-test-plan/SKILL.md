---
name: bugzy-generate-test-plan
description: Create a concise risk-prioritized test plan from product context, application exploration, and documentation. Use before generating concrete test cases.
---

# Generate Test Plan

## When to use

Use when a feature, flow, or project area needs a structured QA plan before manual cases or automation are authored.

## Source basis

Derived from `packages/bugzy/src/tasks/library/generate-test-plan.ts`, `generate-test-plan`, `extract-env-variables`, exploration, clarification, and documentation-gathering steps.

## Workflow

1. Read product context, existing `test-plan.md`, test strategy, documentation, and safety constraints.
2. Explore the product area enough to validate terminology, visible states, routes, and key risks before asking questions.
3. Ask focused clarification only when requirements are contradictory or the requested feature cannot be found.
4. Produce `test-plan.md` as a concise living checklist, ideally under 200 lines.
5. Include feature areas, risk priority, equivalence partitions, boundary values, state transitions, happy/alternative/sad/exception paths, and API endpoints when discovered.
6. Extract required non-secret test data names into `.env.testdata` with TODO values when needed. Never read or expose secret files.
7. Update durable knowledge and summarize coverage priorities, assumptions, and next recommended work.
