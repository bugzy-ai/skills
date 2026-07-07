---
name: jira
description: Work with Jira for QA issue tracking and documentation research. Use when Jira issues, epics, stories, comments, requirements, bugs, or QA status updates are needed.
---

# Jira Integration
Use this skill when jira is the configured external system for one or more QA workflows. Identify the needed workflow first, then load the matching reference before taking action.
## Security and auth
- Use only credentials, tokens, and project identifiers already provided by the environment, configured provider data, or explicit user input.
- Never print or persist secrets.
- If required credentials or permissions are missing, report the blocker and stop before attempting writes.

## Bundled CLI

This skill bundles sdlc-jira-cli in `./cli`. Prefer the command examples below when `jira-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## References

- Read `references/issues.md` for issue tracking tasks.
- Read `references/documentation.md` for documentation research tasks.

## Workflow

1. Determine whether the task is about issues, documentation, or source control.
2. Load the relevant reference file and follow its workflow-specific instructions.
3. Prefer read-only discovery until the user asks for a write or the workflow explicitly requires one.
4. Include durable identifiers, mappings, and conventions in the final output when they affect future work.

## Project versions for release-aware test runs

Release-aware Zephyr workflows use Jira Project Versions as the release source of truth. Use Jira credentials only through `jira-cli`, then pass the returned `version.id` to Zephyr as `jiraProjectVersionId`.

```bash
jira-cli version list --project PROJ
jira-cli version ensure --project PROJ --name "1.2.3"
```

`version ensure` reuses an exact-name unreleased, unarchived match before creating a new unreleased, unarchived Jira Project Version. If the only exact-name matches are released or archived, stop and resolve the Jira version state before continuing. Do not copy Jira credentials into Zephyr commands or Zephyr configuration.
