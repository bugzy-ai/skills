# Lens Selection

Choose the smallest useful design lens before critiquing or planning. The goal is to solve the current design problem, not to apply every framework.

## Selection Steps

1. Restate the concrete design problem in one sentence.
2. Identify evidence: affected files, callers, data flow, docs, tests, runtime behavior.
3. Pick the primary lens from the table below.
4. Add a secondary lens only when it exposes a different failure mode.
5. State why heavier lenses are not needed.

## Lens Table

| Problem signal | Primary lens | Load |
| --- | --- | --- |
| Code is hard to read, functions/classes feel messy, SOLID or smell review requested | Clean Code / SOLID | `clean-code-solid.md` |
| User asks for design patterns or variation points | Design patterns | `design-patterns.md` |
| Existing behavior must stay the same while structure changes | Refactoring | `refactoring-workflow.md` |
| API is awkward, module feels shallow, callers know too much | Complexity / module design | `complexity-modules.md` |
| Dependency direction, layers, adapters, infrastructure coupling | Architecture boundaries | `architecture-boundaries.md` |
| Business terms, aggregates, context boundaries, domain events | DDD | `domain-driven-design.md` |
| Design choice has lasting architecture consequences | Architecture decision | Escalate to the architect workflow |
| Risk of overengineering, premature abstraction, speculative flexibility | Simplicity | `simplicity-principles.md` |

## Combine Lenses Sparingly

Good combinations:

- Refactoring + Clean Code for long methods, duplication, or naming work.
- Complexity + Architecture Boundaries for module/API boundary redesign.
- DDD + Architecture Boundaries for business capability boundaries.
- Architecture decision + any other lens when the decision is durable.
- Simplicity + any lens as an anti-overengineering check.

Avoid combinations that create process overhead without changing the recommendation.

## Evidence Checklist

Before choosing a lens, gather at least the evidence relevant to the task:

- Entry points and callers.
- Data ownership and mutation points.
- Dependency/import direction.
- Existing tests and verification commands.
- Product/docs target state.
- Known constraints: team, framework, deployment, security, performance.

## Output Snippet

```markdown
### Selected design lenses
- Primary: Complexity / module design — callers currently know storage details.
- Secondary: Simplicity — avoid introducing a service layer unless it removes current coupling.
- Not using DDD — no domain language or aggregate boundary decision is involved.
```
