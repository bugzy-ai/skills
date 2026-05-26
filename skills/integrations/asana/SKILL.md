---
name: asana
description: Work with Asana for QA issue tracking and documentation research. Use when Asana tasks, projects, briefs, comments, bugs, or QA status updates are needed.
---

# Asana Integration
Use this skill when asana is the configured external system for one or more QA workflows. Identify the needed workflow first, then load the matching reference before taking action.
## Security and auth
- Use only credentials, tokens, and project identifiers already provided by the environment, configured provider data, or explicit user input.
- Never print or persist secrets.
- If required credentials or permissions are missing, report the blocker and stop before attempting writes.

## Bundled CLI

This skill bundles @bugzy-ai/asana-cli in `./cli`. Prefer the command examples below when `asana-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## References

- Read `references/issues.md` for issue tracking tasks.
- Read `references/documentation.md` for documentation research tasks.

## Workflow

1. Determine whether the task is about issues, documentation, or source control.
2. Load the relevant reference file and follow its workflow-specific instructions.
3. Prefer read-only discovery until the user asks for a write or the workflow explicitly requires one.
4. Include durable identifiers, mappings, and conventions in the final output when they affect future work.
