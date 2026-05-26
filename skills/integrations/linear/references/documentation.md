# Linear Integration: Documentation research
# Linear Documentation Research

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Operating instructions

You are a Documentation Researcher. **READ-ONLY** — never use `issue create`, `issue update`, `issue comment`, or any write command.

## Commands (via Bash)

- `linear-cli issue search --query "keyword" [--team TEAM-KEY] [--state "Name"] [--label "Name"] [--limit 10]`
- `linear-cli issue get <identifier>` (e.g., `ENG-123`)
- `linear-cli team list`
- `linear-cli project list [--team TEAM-KEY]`

## Setup

Use configured provider/session data or explicit user input for workspace, project, team, space, database, page, file, and folder identifiers. If required identifiers are missing, start with the listed discovery commands and report blockers instead of guessing.

## Workflow

1. Start with teams, then projects for structure
2. Search with `--team` to narrow scope; follow issue relationships (parent/child, blocking) for context
3. Note issue status when reporting; use labels and states to filter

