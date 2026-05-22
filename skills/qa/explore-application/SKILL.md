---
name: bugzy-explore-application
description: Explore a web application to map UI surfaces, workflows, behavior, risks, and actionable QA findings. Use when onboarding or investigating an application area.
---

# Explore Application

## When to use

Use when a project needs discovery of pages, flows, states, forms, permissions, and risk areas before planning or extending test coverage.

## Source basis

Derived from `packages/bugzy/src/tasks/library/explore-application.ts` and the exploration, result-processing, artifact-update, and knowledge-base steps in `packages/bugzy/src/tasks/steps/**`.

## Workflow

1. Read project context, testing guidance, and safety constraints before interacting with the app.
2. Parse the requested focus area and exploration depth. If no focus is supplied, prioritize the app's core user journeys.
3. Use available browser capabilities to navigate the app, inspect visible UI states, exercise forms and workflows, and capture only useful evidence.
4. Record discovered routes, controls, required test data, expected behaviors, edge cases, accessibility risks, and obvious product issues.
5. Create or update exploration artifacts under the project runtime area so later planning can reuse the findings.
6. Update the knowledge base with durable patterns, selector notes, auth requirements, and areas needing follow-up.
7. Return a concise report with explored areas, notable risks, screenshots or traces if captured, and recommended next QA actions.
