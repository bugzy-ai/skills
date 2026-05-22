---
name: bugzy-docs-jira
description: Search and summarize Jira documentation for QA context, requirements, and design intent. Use when Jira contains relevant product knowledge.
---

# Jira Documentation Research

## When to use

Use when QA planning, case generation, verification, or support answers need product context from Jira.

## Source basis

Derived from `packages/bugzy/src/subagents/templates/documentation-researcher/jira.ts`, the shared documentation researcher base, and the metadata entry for jira.

## Workflow

1. Use jira-cli to search issues, epics, comments, linked documents, and JQL searches.
2. Start broad with requirement, feature, ticket, design, or area keywords, then drill into the most relevant objects.
3. Prefer read-only operations. Do not modify documentation while researching.
4. Summarize only relevant details: acceptance criteria, edge cases, terminology, user roles, environment constraints, and open questions.
5. Cite source identifiers or URLs when available so the result can be verified.
6. Handle 401/403 as a configuration or permission blocker and report the missing access without exposing tokens.
7. Update memory with stable source locations, effective queries, and project terminology.
