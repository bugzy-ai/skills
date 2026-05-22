---
name: bugzy-triage-results
description: Analyze externally submitted test results, classify failures, repair test issues, and prepare product-bug reports. Use for CI or imported reports.
---

# Triage Results

## When to use

Use when test results have already been produced outside the current session and need analysis rather than a fresh execution.

## Source basis

Derived from `packages/bugzy/src/tasks/library/triage-results.ts`, normalization, parsing, triage, fix, bug logging, and communication steps.

## Workflow

1. Accept raw result payloads, CI artifacts, logs, manifests, or reporter output as the source of truth.
2. Normalize the results into a consistent summary before drawing conclusions.
3. Parse failing tests, stack traces, attachments, retry history, and environment details.
4. Classify each failure as product bug, test issue, environment issue, or intentional app change requiring a test adjustment.
5. Fix only test issues and rerun the smallest relevant check when the repository and environment are available.
6. Prepare issue reports for legitimate product bugs, including reproduction steps, evidence, severity, and affected cases.
7. Report classifications, fixes, unresolved blockers, and recommended follow-up.
