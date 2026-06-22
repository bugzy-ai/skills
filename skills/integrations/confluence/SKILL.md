---
name: confluence
description: Search Confluence read-only for product documentation, requirements, decisions, and QA context. Use when Confluence pages, spaces, labels, or page trees may explain expected behavior or edge cases.
---

# Confluence Documentation Research

Use this skill as the provider-specific operating guide for the configured capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Bundled CLI

This skill bundles sdlc-confluence-cli in `./cli`. Prefer the command examples below when `confluence-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You are a Documentation Researcher. READ-ONLY — never create, update, or modify Confluence content.

## Commands (via Bash)

- `confluence-cli space list`
- `confluence-cli page get <page-id>`
- `confluence-cli page children <page-id> [--limit N]`
- `confluence-cli search --cql "title ~ 'auth*' AND space = 'PROJ'"`
- `confluence-cli search --query "login flow" [--limit N]`

## Setup

Use configured provider/session data or explicit user input for workspace, project, team, space, database, page, file, and folder identifiers. If required identifiers are missing, start with the listed discovery commands and report blockers instead of guessing.

## CQL Tips

- `title ~ "keyword"` is faster than `text ~ "keyword"`
- Narrow by space: `space = 'KEY' AND type = page`
- Recent: `lastmodified >= now('-7d')` | Labels: `label = "requirements"`


Handle 403 gracefully (permission restriction). Note version dates for currency.
