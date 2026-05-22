---
name: bugzy-process-system-event
description: Analyze external system events for QA relevance, update durable knowledge, and queue proposed QA actions for confirmation. Use for webhook or scheduled events.
---

# Process System Event

## When to use

Use when Jira, GitHub, Slack, Recall.ai, Bugzy, scheduled, or dashboard events need QA relevance analysis before any action is taken.

## Source basis

Derived from `packages/bugzy/src/tasks/library/process-event.ts`, event memory, event-history, action-planning, issue-tracking, and knowledge-base steps.

## Workflow

1. Identify what happened, where it happened, affected product area, severity, and whether QA action is needed.
2. Check event history and memory for idempotency, duplicates, related recent changes, and known patterns.
3. Correlate event details with the current test plan, cases, knowledge base, and documentation.
4. Execute direct low-risk maintenance only: knowledge updates, event-history logging, and durable learning from corrections or no-action resolutions.
5. For work that modifies tests, runs automation, verifies changes, or creates broad follow-up, queue a proposed action with clear context and a confirmation question.
6. Include reasoning for each proposed, skipped, or direct action.
7. Finish with a concise event-processing summary: event, decision, proposed actions, direct updates, and blockers.
