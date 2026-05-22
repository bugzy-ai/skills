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

The package manifest exposes `./skills` through `pi.skills`; this repository is intended for Git or local-path installation and is not published to npm as part of BUG-89.

## Layout

- `skills/qa/**` — generic QA workflows derived from `packages/bugzy/src/tasks/**`.
- `skills/onboarding/**` — onboarding workflows derived from the onboarding task source.
- `skills/communication/**` and `skills/events/**` — message and event workflows derived from task source.
- `skills/<role>/<provider>/**` — provider-specific capabilities derived from `packages/bugzy/src/subagents/**`.
- `source-inventory/**` — checked-in inventory of private source task slugs and provider integrations.
- `conversion-map.json` and `CONVERSION_MAP.md` — canonical mapping from source definitions to skill paths.

## Validate

```bash
npm test
npm run validate
```

The validator checks frontmatter, unique skill names, installable package manifest, conversion-map completeness, and forbidden legacy dispatch wording in generic workflow skills.

## Scope boundaries

- This repository authors the skills and conversion map for BUG-89.
- BUG-90 decides which configured provider skills are visible for each project.
- BUG-91 installs or updates selected skills at unified-agent startup.
- The legacy generator in `packages/bugzy/src/tasks` and `packages/bugzy/src/subagents` remains the conversion source until a later migration removes it.
