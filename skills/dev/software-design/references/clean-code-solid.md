# Clean Code and SOLID

Use this reference for code-level design critique: naming, functions, responsibilities, tests, and maintainability.

## Clean Code Priorities

1. Correct behavior with tests or verification.
2. Intent-revealing names.
3. Small, coherent functions and modules.
4. Clear responsibility boundaries.
5. Minimal duplication of knowledge.
6. Error handling that does not obscure the happy path.
7. Comments that explain intent, invariants, or non-obvious trade-offs.

## Naming

Names should reveal purpose and domain meaning.

- Use domain terms when they exist.
- Avoid vague suffixes: `Manager`, `Processor`, `Helper`, `Util`, unless the role is precise.
- Use predicate names for booleans: `isActive`, `hasPermission`, `canEdit`.
- Prefer searchable constants over magic numbers/strings.
- Rename while refactoring if the current name hides intent.

## Functions

A function should operate at one level of abstraction.

Signals to extract or split:

- Comment blocks that describe steps.
- Deep nesting or repeated guard conditions.
- Boolean flag arguments that switch behavior.
- More than a few parameters.
- Hidden side effects in a query-like function.

Prefer guard clauses for exceptional cases, then a straight-line happy path.

## SOLID in Practice

| Principle | Practical check | Typical fix |
| --- | --- | --- |
| SRP | Does this module change for multiple actors or reasons? | Split by reason to change, not by arbitrary layer. |
| OCP | Does adding a variant require editing a central conditional? | Introduce a strategy/registry only when variants are real. |
| LSP | Can subtype implementations be substituted without surprising callers? | Tighten contracts or replace inheritance with composition. |
| ISP | Do clients depend on methods they never call? | Split role-specific interfaces. |
| DIP | Does policy depend on infrastructure details? | Define the interface near the policy; implement it at the edge. |

Do not force SOLID mechanically. A simple function can be better than a class hierarchy.

## Code Smells

| Smell | Why it matters | Common response |
| --- | --- | --- |
| Long Method | Readers must simulate too much behavior. | Extract named steps. |
| Large Class | Multiple reasons to change. | Extract cohesive module/class. |
| Duplicate Knowledge | One rule can diverge across locations. | Extract authoritative source. |
| Feature Envy | Behavior sits away from the data/rules it needs. | Move method or reshape boundary. |
| Shotgun Surgery | One change touches many files. | Encapsulate the scattered knowledge. |
| Primitive Obsession | Business rules are spread across raw strings/numbers. | Introduce value object/type. |
| Data Clumps | Same values travel together. | Introduce parameter object or domain object. |
| Commented-Out Code | Dead code obscures intent. | Delete; version control keeps history. |

## Tests as Design Feedback

Hard-to-test code often exposes design issues:

- Business logic coupled to I/O.
- Hidden time, randomness, or global state.
- Large functions with many branches.
- Constructors that perform work.

Improve seams around external systems, but avoid interfaces solely to mock code that can be tested directly.

## Review Output

When reporting findings:

```markdown
- `path/file.ts:42` — [SRP, Major] `GenerationService` validates input, calls AI, writes storage, and updates audit state. These change for different reasons. Split the storage/audit side effects behind an application-level port; keep orchestration in one use case. Trade-off: one extra boundary, but test setup becomes smaller and failures localize.
```
