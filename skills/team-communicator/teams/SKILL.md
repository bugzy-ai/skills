---
name: bugzy-communicate-teams
description: Post Microsoft Teams updates, replies, and rich QA summaries through teams-cli. Use when Teams is the configured communication channel.
---

# Microsoft Teams Communication

## When to use

Use when QA status, results, blockers, or questions need to be posted to Microsoft Teams channels or threads.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/team-communicator/teams.ts`.

## Workflow

1. Use `teams-cli` for Teams operations.
2. Resolve team, channel, and thread context before posting.
3. Post concise summaries with status, scope, failures, artifacts, and next steps.
4. Use returned message IDs when threading follow-up replies.
5. Avoid secrets and raw command output.
6. If posting fails due to auth or permissions, report the channel context and the error class.
