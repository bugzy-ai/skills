# Refactoring Workflow

Refactoring changes structure without changing observable behavior. Treat it as a sequence of small verified transformations.

## Safety Loop

1. Understand current behavior and callers.
2. Establish baseline: run relevant tests/build/lint when practical.
3. Add characterization tests if behavior is important and uncovered.
4. Apply one small transformation.
5. Run the smallest meaningful verification.
6. Commit or checkpoint mentally before the next transformation.

If verification fails, fix or revert the last transformation before continuing.

## Before Editing Shared Code

- Search all usages and imports.
- Identify public API or external consumers.
- Read the full function/module being changed.
- Check tests that cover it.
- Note invariants, side effects, and error behavior.

## Common Transformations

| Smell / Goal | Transformation |
| --- | --- |
| Long Method | Extract Method; Replace Temp with Query; Introduce Parameter Object. |
| Duplicate Knowledge | Extract Function/Class; Pull Up Method; centralize schema/config. |
| Feature Envy | Move Method or move data/behavior together. |
| Large Class | Extract Class by reason to change. |
| Primitive Obsession | Replace Primitive with Value Object. |
| Complex Conditional | Decompose Conditional; Replace Nested Conditional with Guard Clauses; Replace Conditional with Polymorphism only when variants are stable. |
| Shotgun Surgery | Move Method/Field; encapsulate scattered knowledge. |
| Circular Dependency | Invert dependency; extract stable abstraction; merge modules if separation is artificial. |
| Unsafe Rename | Use tooling where possible; search old and new names; run type-check/build. |

## Refactoring Modes

### Preparatory Refactoring

Restructure just enough to make the requested feature easy. Keep scope tight.

### Comprehension Refactoring

Rename variables or extract small concepts while reading unfamiliar code, only when it clarifies the immediate task.

### Litter-Pickup Refactoring

Fix small nearby issues when touching code, but do not expand beyond the requested change.

### Large Refactoring

Break into stages:

1. Add seam or compatibility path if needed.
2. Move one caller or module at a time.
3. Verify after each group.
4. Remove old path when no references remain.

## When Not to Refactor

- Behavior is unclear and cannot be characterized.
- The code is about to be deleted.
- The refactor is unrelated to the requested task.
- The project lacks time or verification for a high-risk structural change.
- A rewrite would be smaller and safer than preserving deeply flawed structure.

## Refactor Plan Template

```markdown
### Refactor plan
Baseline: `npm run lint`, `npm run build`, targeted tests.
Stage 1: Extract pure parsing logic from `x` into `y`; verify parser tests.
Stage 2: Move callers one at a time; verify type-check after each group.
Stage 3: Delete old helper and stale imports; search old symbol names.
Rollback: revert the last stage; previous stages preserve behavior.
```
