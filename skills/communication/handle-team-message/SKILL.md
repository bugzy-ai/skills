---
name: bugzy-handle-team-message
description: Handle team messages by classifying intent, preserving context, updating QA artifacts from feedback, and producing an appropriate response. Use for conversational QA requests.
---

# Handle Team Message

## When to use

Use when a Slack, Teams, email, local chat, or dashboard message asks a question, provides feedback, requests status, disputes findings, or asks for QA action.

## Source basis

Derived from `packages/bugzy/src/tasks/library/handle-message.ts`, clarification, feedback-sync, knowledge-base, and notification steps.

## Workflow

1. Read recent thread context and classify the message as question, feedback, status request, dispute, or new QA request.
2. For questions, answer from project memory and artifacts; ask one focused clarification only when necessary.
3. For feedback on test cases or automation, update the relevant markdown specifications first, then synchronize automation to the changed expected behavior.
4. For disputes about findings, reconcile against current evidence and use available findings tooling to mark accepted or disputed outcomes when configured.
5. For requests that should become verification or generation work, prepare the precise workflow name and arguments rather than losing context.
6. Update knowledge with durable corrections, project conventions, or recurring misunderstandings.
7. Respond in the channel style with what changed, what remains blocked, and any recommended next action.
