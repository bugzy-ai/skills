---
name: code-comments
description: >
  Use when writing, reviewing, refactoring, or updating code comments in LLM-agent-maintained codebases. Comment Rules: Default to no comments. Add one only when the WHY is non-obvious: a hidden constraint, a subtle invariant, a bug workaround, or behavior that would surprise a reader. If deleting the comment wouldn't confuse anyone, delete it. Never write comments that restate WHAT the code does — rename or refactor instead. Never reference the current task, ticket, PR, or issue ID in comments; that context belongs in the commit message and PR description. A wrong comment is worse than no comment. When you change code, update or remove every affected comment in the same change. Do not remove or reword existing comments unless the code they describe is also removed or the comment is verifiably incorrect. Durable project knowledge goes in CLAUDE.md or docs/, not inline comments; hard constraints belong in tests/linters/hooks, not advisory prose.
license: MIT
metadata:
  version: "1.0.0"
---

# Code Comments

Use this skill to decide whether to add, keep, update, or remove comments while writing or reviewing code.

## Core Rules

- Default to no comments.
- Add a comment only when the WHY is non-obvious: a hidden constraint, subtle invariant, bug workaround, surprising behavior, security concern, operational constraint, or cross-module contract.
- Never add comments that restate WHAT the code does. Improve names, structure, or tests instead.
- Never reference the current task, ticket, PR, issue, session, or reviewer in code comments.
- Treat stale or wrong comments as defects. When code changes, update or remove every affected comment in the same change.
- Preserve existing comments unless the code they describe is removed or the comment is verifiably incorrect.
- Put durable project knowledge in CLAUDE.md, AGENTS.md, docs, ADRs, tests, linters, or hooks, not inline comments.
- Put task context in commit messages, PR descriptions, issue comments, or handoff notes, not code.
- Do not put secrets, customer data, security exploit details, tokens, credentials, or private incident context in comments.

## Add a Comment When

A comment is appropriate when it explains information the code cannot express clearly:

- A non-obvious invariant or precondition.
- A workaround for a real external bug or platform behavior.
- A safety, security, durability, or concurrency constraint.
- An operational reason for an unusual timeout, retry, limit, ordering, or fallback.
- A boundary contract between modules, processes, or services.
- A domain rule whose meaning is not obvious from names alone.

Keep the comment short and factual. Describe the current rule or constraint, not the history of how it was discovered.

## Do Not Add a Comment When

Prefer code changes over comments when the comment would:

- Narrate obvious control flow.
- Repeat a function, variable, class, or type name in sentence form.
- Explain a temporary implementation step from the current task.
- Mention an issue number, PR, ticket, reviewer, or agent session.
- Justify messy code that can be made clearer immediately.
- Duplicate nearby docs or comments.
- Speculate about future requirements.

## Comment Review Workflow

When touching code near comments:

1. Read the comment and the code it describes.
2. Decide whether the comment still describes the current behavior or invariant.
3. If the code changes the meaning, update the comment in the same patch.
4. If the comment only restates code, remove it when it is directly in the edited area.
5. If an existing comment looks odd or load-bearing, preserve it unless you can prove it is wrong.
6. If a hard rule must be enforced, prefer a test, lint rule, type, assertion, or hook over advisory text.

## Preferred Comment Shape

Good comments are stable and domain-oriented:

```ts
// GitHub returns 202 while the branch protection check is still materializing.
// Retry once so a fresh PR does not fail on a transient policy read.
```

Avoid task- or implementation-history comments:

```ts
// Added for BUG-152 review feedback.
// TODO from this PR: clean up later.
// This increments i.
```

## Documentation Placement

Use the smallest durable home for each kind of knowledge:

| Knowledge | Put it in |
| --- | --- |
| Local invariant or surprising constraint | Nearby code comment |
| Public API contract | Interface/type docs or API docs |
| Architecture decision | ADR, LLD, or architecture docs |
| Project-wide agent behavior | CLAUDE.md, AGENTS.md, or a skill |
| Mandatory safety rule | Test, linter, type, assertion, or hook |
| Current task context | Commit message, PR description, issue comment, or handoff note |

## Final Check

Before finishing a code change, ask:

- Did I add only comments that explain non-obvious WHY?
- Did I avoid task, issue, PR, and session references in code?
- Did I update or remove comments invalidated by the code change?
- Did I preserve existing comments whose correctness I could not disprove?
- Would a test, type, linter, or doc be a better home for this knowledge?
