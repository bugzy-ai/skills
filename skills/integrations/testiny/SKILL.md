---
name: testiny
description: Manage Testiny cases, plans, suites, and run uploads. Use when Testiny is the configured test-case manager for creating, updating, listing, or synchronizing QA test artifacts.
---

# Testiny Test Artifact Management

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Bundled CLI

This skill bundles sdlc-testiny-cli in `./cli`. Prefer the command examples below when `testiny-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You manage **test cases, test plans, and test runs** in Testiny.

**Setup:**
1. Confirm the Testiny project id and per-area conventions from configured provider data, session context, or explicit user input. If required identifiers are missing, report the blocker.
2. Run `testiny-cli --version`. If unavailable, STOP: "testiny-cli not installed."

## Test cases

### CREATE
**Idempotency**: Always `testiny-cli list-cases` first and scan titles. Skip if title already exists (Testiny allows duplicate titles — server will not stop you).

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
```bash
testiny-cli create-plan --name "Plan Title" --description "<markdown body>"
```

### READ / LIST
`testiny-cli get-plan --id <numeric>` — fetches a plan by id (includes `_etag`).
`testiny-cli list-plans --limit 50` — lists plans for the configured project.

### UPDATE
`testiny-cli update-plan --id <numeric> --name "..." --description "..."` — the CLI fetches first to capture `_etag`, same shape as `update-case`.

## Test runs (Playwright report upload)

After a Playwright run produces `test-runs/{timestamp}/manifest.json`, convert it to JUnit XML and upload to Testiny. The `testiny-importer` binary (official `@testiny/cli`, preinstalled in the child runtime) accepts JUnit but not our custom manifest format.

### Convert manifest to JUnit XML

```bash
node -e "
const m=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');
const cases=m.testCases.map(tc=>{const e=tc.executions[tc.executions.length-1];let x='';if(tc.finalStatus==='failed'&&e.error)x='\n      <failure message=\"'+esc(e.error)+'\">'+esc(e.error)+'</failure>';return '    <testcase name=\"'+esc(tc.name)+'\" classname=\"'+esc(tc.id)+'\" time=\"'+(e.duration/1000).toFixed(3)+'\">'+x+'\n    </testcase>';});
require('fs').writeFileSync(process.argv[2],'<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<testsuites tests=\"'+m.stats.totalTests+'\" failures=\"'+m.stats.failed+'\">\n  <testsuite name=\"Playwright\" tests=\"'+m.stats.totalTests+'\" failures=\"'+m.stats.failed+'\" timestamp=\"'+m.startTime+'\">\n'+cases.join('\n')+'\n  </testsuite>\n</testsuites>\n');
" test-runs/<TIMESTAMP>/manifest.json /tmp/results.xml
```

### Upload

```bash
testiny-importer automation --junit -P $TESTINY_PROJECT_ID --source sdlc-playwright /tmp/results.xml
```

**No CRUD endpoints on the run resource are exposed via `testiny-cli`** — uploads are file-driven through `testiny-importer`.

## Errors
- **401/403**: STOP, report auth failure (likely invalid `TESTINY_API_KEY` or project-scope mismatch).
- **429**: CLI retries automatically with exponential backoff.
- **409**: `_etag` conflict on update — re-fetch and retry (CLI fetches before PUT, so this typically means concurrent edits).

**Key facts**: Numeric ids (e.g. 42, not PROJ-T42). Duplicate titles/names allowed — always search first. PUT requires `_etag` (CLI handles it). No folder support yet — cases and plans land at project root.


**Summary**: count created/read/updated (with ids), plans created, runs uploaded, external references updated, errors.
