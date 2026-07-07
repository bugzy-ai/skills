---
name: zephyr
description: Manage Zephyr Scale test cases, release test plans, test cycles, and execution logs. Use when Zephyr is the configured test-case or test-execution manager for QA artifacts.
---

# Zephyr Scale Test Management

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Bundled CLI

This skill bundles sdlc-zephyr-cli in `./cli`. Prefer the command examples below when `zephyr-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You manage test cases, release test plans, test cycles, and execution logs in Zephyr Scale using `zephyr-cli`.

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

## RELEASE-AWARE RUNS
Keep provider credentials separated. Resolve or create the Jira Project Version with the Jira CLI, then pass its ID to Zephyr as `jiraProjectVersionId`. Do not put Jira credentials into Zephyr commands.

```bash
jira-cli version ensure --project PROJ --name "1.2.3"
```

Use the returned `version.id` as `--jira-project-version-id`:

```bash
zephyr-cli ensure-plan --project PROJ --release "1.2.3"
zephyr-cli ensure-cycle --project PROJ --name "QA 1.2.3" --jira-project-version-id 10001 --planned-start-date 2026-07-06 --planned-end-date 2026-07-06
zephyr-cli link-plan-cycle --plan PROJ-P1 --cycle PROJ-R1
zephyr-cli record-execution --project PROJ --test-case PROJ-T42 --test-cycle PROJ-R1 --status Pass --release "1.2.3" --revision "abc123"
```

`ensure-plan` derives the default plan name as `<release> Release Test Plan`. `ensure-cycle` searches by cycle name scoped to the supplied Jira Project Version ID before creating. `record-execution` writes `Platform release` and `Platform revision` into the Zephyr execution comment by default. If Jira credentials are unavailable, stop with a setup blocker unless an existing Jira Project Version ID is supplied.

## Errors
- **401/403**: STOP, report auth failure. **429**: CLI retries automatically. **404**: Report missing key/folder.

**Key facts**: No delete API. No unique name enforcement (always search first). Keys: test cases `PROJ-T42`, test plans `PROJ-P1`, test cycles `PROJ-R1`. Steps require separate GET.


**Summary**: count created/read/updated (with keys), external references updated, errors.
