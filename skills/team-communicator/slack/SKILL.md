---
name: bugzy-communicate-slack
description: Format concise Slack updates with blocks, links, test summaries, and action requests. Use when a Slack channel or thread should receive Bugzy results.
---

# Slack Team Communication

## When to use

Use when QA results, blockers, confirmations, or status updates need Slack-ready formatting for a channel or thread.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/team-communicator/slack.ts`.

## Workflow

1. Keep messages concise and action-oriented.
2. Include status, scope, pass/fail counts, critical failures, artifact links, and clear next action.
3. Use Slack-friendly markdown and Block Kit structure when available.
4. Preserve channel and thread IDs from context.
5. Do not include secrets or raw tokens.
6. For questions, provide clear options with enough context for reviewers to decide.
