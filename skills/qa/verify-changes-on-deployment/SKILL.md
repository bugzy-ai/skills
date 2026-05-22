---
name: bugzy-verify-changes-on-deployment
description: Verify a deployed preview or environment using the deployment URL as source of truth. Use for preview deployment events.
---

# Verify Changes on Deployment

## When to use

Use when a Vercel, GitHub, AWS, or similar deployment event provides a preview URL or deploy target that needs QA verification.

## Source basis

Derived from `packages/bugzy/src/tasks/library/verify-changes-on-deployment.ts` and shared verification, execution, reporting, and special-case steps.

## Workflow

1. Treat the deployment payload and preview URL as authoritative for the environment under test.
2. Set the test base URL to the preview target for this run and prefer deployment metadata over stale external lookups.
3. Use PR, commit, release, and deployment descriptions to determine black-box scope; do not inspect diffs to decide what to test.
4. Explore the preview URL first to verify availability and visible behavior.
5. Add or update tests for meaningful coverage gaps, run targeted checks against the preview URL, and triage failures.
6. Prepare PR, deployment, or check-run reporting with environment, commit, scope, pass/fail summary, bugs, manual checklist, and recommendation.
7. Update knowledge with preview-environment patterns and special cases.
