---
name: bugzy-verify-changes-on-ticket
description: Verify work represented by an issue-tracker ticket that moved into QA or review. Use when ticket context is the authoritative trigger.
---

# Verify Changes on Ticket

## When to use

Use for Jira, Asana, Linear, Azure DevOps, or similar ticket events indicating that a story or bug is ready for QA verification.

## Source basis

Derived from `packages/bugzy/src/tasks/library/verify-changes-on-ticket.ts` and the shared verification execution, triage, reporting, and knowledge-base steps.

## Workflow

1. Treat the ticket title, description, acceptance criteria, status transition, and comments as the authoritative change context.
2. Resolve related PRs or commits only to enrich context; do not inspect code diffs to choose tests.
3. Explore the app before asking questions. Do not ask vague questions when the ticket clearly states expected behavior.
4. Determine risk-based verification scope from acceptance criteria, affected workflows, environments, and existing test coverage.
5. Add missing tests for durable coverage gaps when appropriate, then update the living test plan.
6. Run targeted automated checks, triage failures, fix test issues, and document product bugs separately.
7. Produce a ticket-ready QA sign-off comment with tested scope, pass/fail summary, evidence, manual checklist, bugs found, and recommendation.
