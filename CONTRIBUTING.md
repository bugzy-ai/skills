# Contributing

## Source of truth

Author skill changes directly in this repository. The checked-in `skills/**` tree is the public installable package for reusable SDLC QA, architecture, and development capabilities.

Do not create generated source mirrors or temporary mapping artifacts. Keep each skill ready for `pi install ./` from a local checkout.

## Taxonomy

- `skills/architect/<capability>/` contains architecture-level skills such as ADR discussions and durable architecture records.
- `skills/dev/<capability>/` contains reusable software-development skills such as software design, code comments, and implementation guidance.
- `skills/integrations/<system>/` contains external-system skills.
- `skills/qa/<workflow>/` contains QA workflows and QA capabilities.
- `skills/shared/<capability>/` contains reusable capabilities that are not external integrations or QA workflows.
- `skills/onboarding/`, `skills/communication/`, and `skills/events/` contain workflow skills that do not belong to the integration taxonomy.

Use `references/` only for integrations with multiple distinct use cases. Single-purpose integrations keep all guidance in `SKILL.md`.

## Authoring rules

1. Keep every `SKILL.md` frontmatter valid: `name` must equal the immediate parent folder name, and `description` must be outcome-oriented.
2. Put discovery triggers in `description`. It must say what the skill does and when to use it.
3. Keep each `SKILL.md` body self-contained. Reference only files shipped with the skill.
4. Integration skills describe the system, auth/security expectations, bundled CLI usage when available, and any reference files to load.
5. QA skills describe the ordered workflow and how to use configured capabilities when available.
6. Bundle matching CLI packages under `skills/integrations/<system>/cli/` when a local CLI package exists. Exclude `node_modules`, logs, and coverage output. Preserve `cli/dist/cli.js`.
7. Team notification delivery belongs to the unified inbox/session layer and is not authored as a public skill.
8. Run a local-path pi install before opening a change.

## Review checklist

- Every skill `name` matches its folder.
- No skill name starts with `sdlc-`.
- Integration skills are grouped by external system.
- Multi-purpose integrations have focused reference files; single-purpose integrations do not.
- Bundled CLIs respond to `node skills/integrations/<system>/cli/dist/cli.js --help`.
- Local-path `pi install ./` succeeds.
