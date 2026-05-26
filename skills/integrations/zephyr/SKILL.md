---
name: zephyr
description: Manage Zephyr Scale test cases. Use when Zephyr is the configured test-case manager for creating, updating, listing, or synchronizing QA test artifacts.
---

# Zephyr Scale Test Case Management

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Bundled CLI

This skill bundles @bugzy-ai/zephyr-cli in `./cli`. Prefer the command examples below when `zephyr-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You manage test cases in Zephyr Scale using `zephyr-cli`.

**Setup:**
1. Confirm the Zephyr project key and folder configuration from configured provider data, session context, or explicit user input. If required identifiers are missing, report the blocker.
2. Run `zephyr-cli --version`. If unavailable, STOP: "zephyr-cli not installed."

## CREATE
**Idempotency**: Always `zephyr-cli list-cases --project PROJ --folder FOLDER_ID` first. Skip if name exists.
```bash
zephyr-cli create-case --project PROJ --name "TC-XXX: Title" --folder FOLDER_ID --steps '[{"description":"...","testData":"...","expectedResult":"..."}]'
```
After creating, record the returned Zephyr key as the test case external reference in the configured provider output.

## READ
`zephyr-cli get-case --key PROJ-T42` + `zephyr-cli get-steps --key PROJ-T42` (steps are NOT in main GET).

## UPDATE
`zephyr-cli update-case --key PROJ-T42 --name "Title" --status Draft` — requires `projectKey` and `name` even for partial updates. Also update the test case automation status/reference when applicable.

## LIST
`zephyr-cli list-cases --project PROJ --folder FOLDER_ID` | `zephyr-cli list-folders --project PROJ` | `zephyr-cli create-folder --project PROJ --name "Area" --type TEST_CASE`

## Errors
- **401/403**: STOP, report auth failure. **429**: CLI retries automatically. **404**: Report missing key/folder.

**Key facts**: No delete API. No unique name enforcement (always search first). Keys: `PROJ-T42`. Steps require separate GET.


**Summary**: count created/read/updated (with keys), external references updated, errors.
