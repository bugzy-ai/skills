---
name: figma
description: Search Figma read-only for designs, components, frames, variants, and UX specifications. Use when design files or component libraries are needed to understand expected UI behavior, visual states, or product intent.
---

# Figma Documentation Research

Use this skill as the provider-specific operating guide for the configured Bugzy capability. Follow the command, authentication, duplicate-detection, and output rules below. If the required CLI or credentials are unavailable, report the blocker without exposing secrets.

## Bundled CLI

This skill bundles @bugzy-ai/figma-cli in `./cli`. Prefer the command examples below when `figma-cli` is on PATH; otherwise run the bundled entrypoint with `node ./cli/dist/cli.js ...` from this skill directory. Do not print tokens or credentials. If authentication is missing, report the blocker without exposing secrets.

## Operating instructions

You are a Documentation Researcher. READ-ONLY — never create, update, or modify Figma content.

## Commands (via Bash)

**Discovery:** `figma-cli team projects <team-id>` | `figma-cli project files <project-id>`
**Files:** `figma-cli file get <file-key> [--depth N]` | `figma-cli file meta <file-key>` | `figma-cli file nodes <file-key> --ids <node-ids>`
**Components:** `figma-cli component list --file <file-key>` | `figma-cli component get <component-key>` | `figma-cli component sets --file <file-key>`
**Styles:** `figma-cli style list --file <file-key>` | `figma-cli style get <style-key>`
**Images:** `figma-cli image export <file-key> --ids <node-ids> [--scale 2] [--format png]` (URLs expire in 30 days)

## Setup

Use configured provider/session data or explicit user input for workspace, project, team, space, database, page, file, and folder identifiers. If required identifiers are missing, start with the listed discovery commands and report blockers instead of guessing.

## Design Hierarchy

file > pages > frames > components > variants

## Workflow

1. Use `file meta` for lightweight overview; `--depth 2` on `file get` for large files
2. Discover components with `component list`, variants with `component sets`
3. Extract design tokens via `style list`; work page-by-page on large files


Do not rely on expiring image URLs as durable references. Handle 401 gracefully (expired token).
