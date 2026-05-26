# Bugzy Skills

Public installable pi skill package for Bugzy's reusable QA capabilities.

## Install

Install from GitHub:

```bash
pi install git:github.com/bugzy-ai/skills@main
```

Install from a local checkout while developing:

```bash
pi install ./
```

The package manifest exposes `./skills` through `pi.skills`; this repository is intended for Git or local-path installation.

## Progressive disclosure

Pi sees only each skill's `name` and `description` until the skill is loaded. Every description states both:

- what capability the skill provides
- when to use it, including likely user intent or trigger conditions

The loaded `SKILL.md` body is the executable operating guide. It must be self-contained and should point only to files shipped inside the skill directory.

## Layout

- `skills/integrations/**` — external systems such as Jira, Linear, GitHub, Notion, Zephyr, and Testiny.
  - Multi-purpose integrations use `references/` for distinct workflows such as issues, documentation, or source control.
  - Single-purpose integrations keep all instructions in `SKILL.md`.
  - Integrations with local support tools bundle the matching CLI under `cli/`.
- `skills/qa/**` — QA role workflows and QA capabilities, including test planning, case generation, execution, triage, verification, filesystem test cases, and test automation.
- `skills/shared/**` — reusable non-integration capabilities such as browser automation.
- `skills/onboarding/**`, `skills/communication/**`, and `skills/events/**` — workflow skills for onboarding, message handling, and system events.

Every `SKILL.md` frontmatter `name` must equal the immediate parent folder name. For example, `skills/integrations/jira/SKILL.md` uses `name: jira`, and `skills/shared/browser-automation/SKILL.md` uses `name: browser-automation`.

## Bundled CLIs

Integration CLI packages are copied into the corresponding skill at `skills/integrations/<integration>/cli/`. Runtime junk such as `node_modules`, logs, and coverage output is not committed. The bundled entrypoint is `cli/dist/cli.js`, so a skill can use `node ./cli/dist/cli.js ...` when the named command is not on `PATH`.

## Scope boundaries

- Author skills directly in this repository.
- Keep integration skills grouped by system, not by Bugzy role.
- Keep reference files only when an integration has multiple distinct use cases.
- Team chat delivery is handled outside this public skills package.
