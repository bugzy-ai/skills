# ADR Template and Decision Records

Use an Architecture Decision Record when a design choice is durable, expensive to reverse, cross-cutting, or likely to be revisited.

## When to Write an ADR

Write or update an ADR when deciding:

- Architecture style or major module boundary.
- Database/storage strategy.
- Auth, authorization, or security boundary.
- External service/vendor integration.
- Build/deployment/runtime approach.
- Public API contract.
- Refactor strategy with long-lived consequences.

Do not write ADRs for routine implementation details or easily reversible local choices.

## Location

Follow the repository’s existing convention. If none exists, propose:

```text
docs/adr/NNN-short-title.md
```

In repositories with low-level design docs, an LLD update may be more appropriate than a separate ADR.

## ADR Template

```markdown
# ADR-NNN: Title

Status: Proposed | Accepted | Deprecated | Superseded
Date: YYYY-MM-DD
Deciders: Names or roles

## Context

What forces are at play? Include requirements, constraints, current architecture, risks, and relevant evidence.

## Decision

State the chosen option clearly.

## Options Considered

### Option A: Name

- Pros:
- Cons:
- Risks:
- Verification:

### Option B: Name

- Pros:
- Cons:
- Risks:
- Verification:

## Consequences

What becomes easier? What becomes harder? What new constraints exist?

## Follow-ups

- [ ] Implementation task
- [ ] Verification task
- [ ] Documentation update
```

## Option Matrix

Use a matrix when comparing several options:

| Dimension | Option A | Option B | Option C |
| --- | --- | --- | --- |
| Simplicity | | | |
| Fit to current requirements | | | |
| Reversibility | | | |
| Testability | | | |
| Security/data boundary | | | |
| Operational burden | | | |
| Team familiarity | | | |
| Cost/performance | | | |

## ADR Review Gate

Before proposing acceptance:

- Evidence is cited.
- The chosen option has a simpler alternative considered.
- Consequences include drawbacks, not only benefits.
- Verification is concrete.
- Follow-ups are actionable.
- The decision is scoped; unrelated choices are not bundled.

## Output Snippet

```markdown
Architecture decision impact: Required. This changes the data-access boundary for generated documents and affects future storage integrations. Add `docs/adr/NNN-document-storage-boundary.md` or update the existing data-access LLD if that is the repo convention.
```
