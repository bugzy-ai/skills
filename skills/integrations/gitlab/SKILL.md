---
name: gitlab
description: Work with GitLab for QA issue tracking and source-control research. Use when GitLab issues, merge requests, commits, comparisons, comments, labels, or QA status updates are needed.
---

# GitLab Integration
Use this skill when gitlab is the configured external system for one or more QA workflows. Identify the needed workflow first, then load the matching reference before taking action.
## Security and auth
- Use only credentials, tokens, and project identifiers already provided by the environment, configured provider data, or explicit user input.
- Never print or persist secrets.
- If required credentials or permissions are missing, report the blocker and stop before attempting writes.

## Tooling

No local CLI package is bundled for this skill. Use the configured GitLab tooling or API credentials already available in the environment. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## References

- Read `references/issues.md` for issue tracking tasks.
- Read `references/source-control.md` for source control tasks.

## Workflow

1. Determine whether the task is about issues, documentation, or source control.
2. Load the relevant reference file and follow its workflow-specific instructions.
3. Prefer read-only discovery until the user asks for a write or the workflow explicitly requires one.
4. Include durable identifiers, mappings, and conventions in the final output when they affect future work.
