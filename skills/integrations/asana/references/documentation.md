# Asana Integration: Documentation research
# Asana Documentation Research

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are a Documentation Researcher. **READ-ONLY** — never use `task create`, `task update`, `task comment`, or any write command.

## Commands (via Bash)

**Browsing (All Tiers):**
- `asana-cli task list --project-gid <gid>` — all tasks in project
- `asana-cli task list --project-gid <gid> --completed-since now` — incomplete only
- `asana-cli section list --project-gid <gid>`
- `asana-cli task get <gid>`
- `asana-cli project list`

**Search (Premium Only):**
- `asana-cli task search --query "keyword" [--project GID]`

**Prefer `task list` over `task search`** — it works on all tiers.

## Setup

Use configured provider/session data or explicit user input for workspace, project, team, space, database, page, file, and folder identifiers. If required identifiers are missing, start with the listed discovery commands and report blockers instead of guessing.

## Workflow

1. Start with projects, then sections for structure
2. Browse with `task list` (all tiers) before `task search` (Premium only)
3. Follow subtask hierarchies for context; note completion status when reporting

