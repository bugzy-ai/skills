---
name: testiny
description: Manage Testiny cases, plans, suites, and run uploads. Use when Testiny is the configured test-case manager for creating, updating, listing, or synchronizing QA test artifacts.
---

# Testiny Test Artifact Management

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Bundled CLI

This skill bundles @bugzy-ai/testiny-cli in `./cli`. Prefer the command examples below when `testiny-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You manage **test cases, test plans, and test runs** in Testiny.

**Setup:**
1. Confirm the Testiny project id and per-area conventions from configured provider data, session context, or explicit user input. If required identifiers are missing, report the blocker.
2. Run `testiny-cli --version`. If unavailable, STOP: "testiny-cli not installed."

## Test cases

### CREATE
**Idempotency**: Always `testiny-cli list-cases` first and scan titles. Skip if title already exists (Testiny allows duplicate titles — server will not stop you).

Prefer the structured dispatcher tool when wiring from a task agent:

```
create_test_case({ projectId, name, path, content })
```

It routes to Testiny automatically when the project is configured for it and tracks the creation for billing. Equivalent direct CLI:

```bash
testiny-cli create-case --name "TC-XXX: Title" --steps "Step 1: ...\nStep 2: ..." --precondition "Logged in" --expected "Dashboard shown"
```

Default template is `STEPS`. For free-form markdown bodies use `--template TEXT --content "..."`. The returned JSON contains the numeric `id` — record it.

After creating, record the returned numeric id as the test case external reference in the configured provider output.

### READ
`testiny-cli get-case --id <numeric>` — returns the full case including `steps_text`, `content_text`, `precondition_text`, `expected_result_text`, and `_etag`.

### UPDATE
`testiny-cli update-case --id <numeric> --name "New title" --steps "..."` — the CLI handles `_etag` round-trip automatically. Also update the test case automation status/reference when applicable.

### LIST
`testiny-cli list-cases --limit 50` — lists cases for the configured project. Filter client-side by title when you need a subset (server-side filtering beyond `project_id` equality is not yet wired).

## Test plans

### CREATE
Prefer the dispatcher tool:

```
create_test_plan({ projectId, name, path, content })
```

`name` is the plan title; `content` is the description body (supports markdown). The dispatcher routes to Testiny and tracks the creation. Direct CLI equivalent:

```bash
testiny-cli create-plan --name "Bugzy SaaS Plan" --description "<markdown body>"
```

### READ / LIST
`testiny-cli get-plan --id <numeric>` — fetches a plan by id (includes `_etag`).
`testiny-cli list-plans --limit 50` — lists plans for the configured project.

### UPDATE
`testiny-cli update-plan --id <numeric> --name "..." --description "..."` — the CLI fetches first to capture `_etag`, same shape as `update-case`.

## Test runs (Playwright report upload)

After running Playwright via `run_tests` and obtaining a report path, upload it to Testiny:

```
upload_test_run({ projectId, reportPath })
```

Routes to `testiny automation <reportPath>` (the official @testiny/cli batch importer, preinstalled in the child runtime). The dispatcher tracks the upload for billing. **No CRUD endpoints on the run resource are exposed via `testiny-cli`** — uploads are file-driven through `@testiny/cli`. In filesystem mode the dispatcher is a no-op (the skill already writes `test-runs/`).

## Errors
- **401/403**: STOP, report auth failure (likely invalid `TESTINY_API_KEY` or project-scope mismatch).
- **429**: CLI retries automatically with exponential backoff.
- **409**: `_etag` conflict on update — re-fetch and retry (CLI fetches before PUT, so this typically means concurrent edits).

**Key facts**: Numeric ids (e.g. 42, not PROJ-T42). Duplicate titles/names allowed — always search first. PUT requires `_etag` (CLI handles it). No folder support yet — cases and plans land at project root.


**Summary**: count created/read/updated (with ids), plans created, runs uploaded, external references updated, errors.
