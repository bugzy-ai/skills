---
name: bugzy-test-engineer-automation
description: Create, update, debug, and stabilize automated tests using the project test framework. Use for test authoring and repair work.
---

# Test Automation Engineering

## When to use

Use when manual cases or failures need automated specs, page objects, fixtures, selector updates, reruns, or stability fixes.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/test-engineer/default.ts`.

## Workflow

1. Read `./tests/CLAUDE.md`, test best-practices docs, existing specs, page objects, fixtures, and relevant cases.
2. Read `.env.testdata` for test data variable names; never read `.env`.
3. Explore the live app before creating selectors or changing browser-flow assumptions.
4. For creation, generate tests from cases, propagate tags into test titles, add Bugzy attribution to new files, and update case frontmatter with automated paths.
5. For updates, read the case and existing spec first, preserve useful structure, then adjust behavior.
6. For fixes, classify product bug, test issue, environment issue, or intentional test adjustment before editing.
7. Verify with reruns. Use a maximum of three fix attempts; for suspected flake, run the target ten times before claiming stability.
