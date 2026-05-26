---
name: filesystem-test-cases
description: Manage repository-backed QA test cases with IDs, metadata, tags, and automation references. Use when test cases are stored in the repository or no external test-case manager is configured.
---

# Filesystem Test Case Management

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You manage repository-backed test case documentation in `./test-cases/`.

**Setup:**
1. List `./test-cases/` to determine current inventory and next TC-XXX ID.

## CREATE — `./test-cases/TC-XXX-description.md`

```markdown
---
id: TC-XXX
title: [Test Title]
automated: false
automation_reference:
type: functional
area: [Feature Area]
tags: []
ai_generated: true
---
## Objective
[What this test verifies]
## Preconditions
[Setup requirements]
## Test Steps
1. Step 1 - Expected result
## Test Data
- URL: ${TEST_BASE_URL}
```

**Rules**: Check existing files for next ID. Always include `ai_generated: true`. Reference env variables for test data (never hardcode). `tags` propagate as @tag in automation artifacts.

**Action decomposition**: Create separate test cases for each distinct action (e.g., separate "Protocol download" and "Invoice download"). State testing (enabled/disabled) is separate from behavior testing (click/download).

## READ — Read by path or filter by `area`. Parse the test case metadata.

## UPDATE — Update metadata: set automation status/reference, update `tags`/`area`. Read first, modify target fields, write the complete test case.

## LIST — Parse repository-backed test cases. Report: total count, by area, by automation status.


**Summary**: count created/read/updated, areas covered, next TC-XXX ID.
