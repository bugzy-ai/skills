---
name: software-design
description: Guides software design, architecture critique, clean-code review, design-pattern selection, and safe refactoring. Use when designing features, evaluating architecture, planning refactors, reviewing module boundaries, writing ADRs, or applying SOLID, Clean Architecture, DDD, KISS, DRY, YAGNI, TDD, design patterns, or complexity-management principles.
license: MIT
metadata:
  version: "2.0.0"
---

# Software Design

Use this skill for design-quality work: architecture reasoning, design critique, module boundaries, API shape, pattern selection, and behavior-preserving refactoring plans. It is not a raw code-generation shortcut.

Understand the repository and critique the current design before synthesizing recommendations or editing code.

## When to Use

Use this skill for:

- Architecture review, feature design, and service or module boundary decisions.
- Code-quality critique involving SOLID, Clean Code, KISS, DRY, YAGNI, TDD, or design patterns.
- Refactor planning, preparatory refactoring, and behavior-preserving migrations.
- Clean Architecture, DDD, ports/adapters, layering, dependency direction, and ADR work.
- API/interface design, deep-module design, information hiding, and complexity reduction.

Skip it for trivial single-file fixes where the design surface is obvious.

## Core Operating Principles

- Inspect the repo before making design claims. Cite files, symbols, commands, docs, or runtime evidence.
- Choose the smallest design lens that fits the problem. Do not apply every framework to every task.
- Prefer the simplest design that satisfies current constraints and known change pressure.
- Make trade-offs explicit: complexity, coupling, testability, reversibility, performance, security, and team familiarity.
- Preserve behavior during refactors unless the user explicitly requests behavior change.
- Recommend abstractions only when they reduce current complexity, protect a volatile boundary, or make a required variation explicit.
- Verify with the repo's existing build, type-check, test, lint, static-analysis, and security checks.
- Record durable architecture or behavior decisions in the relevant docs or ADRs.

## Required Workflow

1. **Build evidence first.** Identify entry points, callers/callees, data flow, module boundaries, conventions, docs, tests, and verification commands.
2. **Normalize the task envelope.** State objective, constraints, assumptions, non-goals, acceptance criteria, affected components, and verification gates.
3. **Select design lenses.** Use [lens-selection.md](references/lens-selection.md) to choose only the lenses needed for the task.
4. **Critique before prescribing.** For each finding include: finding, evidence, impact, recommendation, and trade-off.
5. **Present options for non-trivial decisions.** Include pros, cons, risks, and when to choose each option.
6. **Plan small stages.** Use behavior-preserving checkpoints, rollback points, and verification after meaningful changes.
7. **Implement only the requested scope.** Avoid opportunistic rewrites, speculative layers, and unrelated cleanup.
8. **Verify and document.** Run practical checks and identify docs/ADR updates.

## Lens Reference Map

Load reference files only when relevant:

| Problem shape | Reference |
| --- | --- |
| Unsure which design approach applies | [lens-selection.md](references/lens-selection.md) |
| Over-engineering risk, duplicated knowledge, premature flexibility | [simplicity-principles.md](references/simplicity-principles.md) |
| Naming, functions, SOLID, smells, tests, comments | [clean-code-solid.md](references/clean-code-solid.md) |
| Factory, Strategy, Adapter, Facade, Observer, Repository, DI, pattern selection | [design-patterns.md](references/design-patterns.md) |
| Existing code needs restructuring without behavior changes | [refactoring-workflow.md](references/refactoring-workflow.md) |
| API/module design, deep modules, information hiding, complexity signals | [complexity-modules.md](references/complexity-modules.md) |
| Layering, dependency rule, ports/adapters, component boundaries | [architecture-boundaries.md](references/architecture-boundaries.md) |
| Domain modeling, bounded contexts, aggregates, domain events | [domain-driven-design.md](references/domain-driven-design.md) |
| Durable decisions, architecture options, consequences | [adr-template.md](references/adr-template.md) |

## Design Gates

Before recommending a design, answer:

- **Evidence:** What code, docs, tests, or runtime behavior support the recommendation?
- **Change pressure:** What concrete change does the design make easier?
- **Complexity budget:** What complexity does it add, remove, or move?
- **Boundary value:** What knowledge or volatility is hidden behind the boundary?
- **Simpler alternative:** What is the simplest viable option, and why is it enough or not enough?
- **Verification:** How will correctness, build health, and behavior preservation be checked?

## Anti-Patterns to Block

- Pattern use without a named force or simpler alternative.
- Interfaces with one implementation unless they protect a volatile boundary or improve tests materially.
- Layering that only mirrors a framework and does not clarify business capability or dependency direction.
- DRY extraction of coincidentally similar code that represents different business knowledge.
- Refactoring and feature behavior changes in the same unverified step.
- Comments or docs that restate code instead of capturing intent, invariants, trade-offs, or contracts.

## Output Formats

For design or review requests, return:

1. Task envelope.
2. Evidence summary.
3. Selected design lenses.
4. Critique with evidence, impact, recommendation, and trade-off.
5. Options considered.
6. Recommended approach.
7. Implementation stages.
8. Verification gates.
9. Docs/ADR impact.

For implementation planning, include exact files to touch and commands to run.

For code-review-style findings, cite `file_path:line_number` and prioritize issues by severity.
