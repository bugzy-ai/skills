---
name: bugzy-browser-playwright
description: Use Playwright to explore pages, run browser checks, inspect DOM state, capture evidence, and debug web UI behavior. Use for browser-based QA work.
---

# Playwright Browser Automation

## When to use

Use when a QA workflow needs live browser interaction, page snapshots, selectors, dialogs, navigation, network observation, screenshots, traces, or video evidence.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/browser-automation/playwright.ts` and the browser automation capability profile.

## Workflow

1. Start with the target URL, route, user role, and expected behavior.
2. Prefer stable locators and snapshots before low-level selectors.
3. Register dialog handlers before clicks that may open dialogs.
4. Use explicit waits for app state, not arbitrary sleeps.
5. Capture screenshots, traces, videos, or network details only when they help explain findings.
6. Re-snapshot after DOM-changing actions and document visible state transitions.
7. Report exact steps, selectors or roles used, observed behavior, evidence paths, and unresolved blockers.
