---
name: bugzy-communicate-email
description: Send email summaries for QA results, blockers, and confirmations through Resend. Use when email is the configured communication path.
---

# Email Communication

## When to use

Use when a QA summary, blocker, question, or result report needs to be delivered by email.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/team-communicator/email.ts`.

## Workflow

1. Use `resend-cli` with required recipient and subject fields.
2. Write a clear subject that includes project area and status.
3. Structure the body with scope, outcome, failures, artifacts, and requested action.
4. Keep sensitive tokens, raw logs, and private credentials out of email.
5. Include links rather than large inline artifacts when possible.
6. Report delivery errors with enough context to retry.
