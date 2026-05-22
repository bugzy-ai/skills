---
name: bugzy-communicate-local
description: Communicate QA status and questions in a local terminal or chat session. Use when no external team channel is configured.
---

# Local Communication

## When to use

Use for local CLI sessions where responses, blockers, and approval questions should be shown directly to the user.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/team-communicator/local.ts`.

## Workflow

1. Answer directly in concise markdown.
2. For decisions, ask one focused question and provide clear options.
3. Include paths, commands, artifacts, and status without exposing secrets.
4. For blockers, state what was attempted, what failed, and what input is needed.
5. For results, include pass/fail counts, evidence paths, and recommended next step.
