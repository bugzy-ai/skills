---
name: bugzy-docs-linear
description: Search and summarize Linear documentation for QA context, requirements, and design intent. Use when Linear contains relevant product knowledge.
---

# Linear Documentation Research

## When to use

Use when QA planning, case generation, verification, or support answers need product context from Linear.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/documentation-researcher/linear.ts`, the shared documentation researcher base, and the metadata entry for linear.

## Workflow

1. Use linear-cli to search issues, projects, cycles, labels, comments, and roadmaps.
2. Start broad with requirement, feature, ticket, design, or area keywords, then drill into the most relevant objects.
3. Prefer read-only operations. Do not modify documentation while researching.
4. Summarize only relevant details: acceptance criteria, edge cases, terminology, user roles, environment constraints, and open questions.
5. Cite source identifiers or URLs when available so the result can be verified.
6. Handle 401/403 as a configuration or permission blocker and report the missing access without exposing tokens.
7. Update memory with stable source locations, effective queries, and project terminology.
