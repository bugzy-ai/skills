# Contributing

## Source of truth

Author skill changes from the private Bugzy source definitions:

- `packages/bugzy/src/tasks/**` for generic workflows.
- `packages/bugzy/src/subagents/**` for provider-specific capabilities.

Do not copy from the deleted `packages/bugzy/skills` directory.

## Authoring rules

1. Keep every `SKILL.md` frontmatter valid: unique kebab-case `name` and outcome-oriented `description`.
2. Generic workflow skills describe the outcome and workflow. They must not mention legacy dispatch mechanics, placeholders, or provider selection.
3. Provider-specific skills may name CLIs, provider IDs, auth assumptions, and provider-specific objects.
4. Add or update `source-inventory/**` when source task slugs or provider integrations change.
5. Update both `conversion-map.json` and `CONVERSION_MAP.md` for every added, renamed, or removed skill.
6. Run `npm test` and `npm run validate` before opening a change.

## Validation checklist

- Every current task slug and deprecated alias has a mapping.
- Every current role/integration pair has a mapping.
- No generic workflow skill leaks legacy dispatch wording.
- Local-path pi install succeeds before a release tag is cut.
