---
name: architecture-decision
description: >
  Facilitate architecture decision discussions and produce concise ADRs for hard-to-reverse software design choices. Use when planning or reviewing state ownership, public contracts, module boundaries, database schemas, auth models, lifecycle/async choices, consistency, rollout, or other load-bearing decisions where alternatives and consequences should be recorded.
license: MIT
metadata:
  version: "1.0.0"
---

# Architecture Decision

> When loading references, resolve paths relative to this skill directory.

Use this skill to decide architecture questions and record ADRs when the
decision is durable. The output is a decision, not a full implementation plan.

## When to Use

Use this skill for choices that are expensive to reverse:

- state ownership or lifecycle;
- public API, event, webhook, or message contracts;
- database schema, migration, or persistence ownership;
- cross-component module boundaries;
- auth/authz model;
- sync vs async execution;
- consistency, transaction, retry, or idempotency model;
- rollout, compatibility, or migration strategy.

Do not create an ADR for local code organization, one-file helper extraction,
test strategy, naming, or a choice with no meaningful alternative.

## Core Rules

- Build evidence before deciding: issue requirements, architecture docs, ADRs,
  code paths, existing contracts, tests, runtime constraints, and stakeholder
  constraints.
- Discuss 2-4 concrete options. Include the simpler/do-nothing option when it
  is viable.
- Tie detail to reversibility. Plan one-way doors carefully; leave two-way-door
  local implementation details to coding.
- Record trade-offs directly: complexity, coupling, migration cost,
  operational risk, security, testability, and future change pressure.
- ADRs capture **why this, not that**. They do not contain schemas, code blocks,
  rollout task lists, or implementation steps.
- If the decision cannot be made from current evidence, recommend the smallest
  spike that would answer it.

## Workflow

### 1. Frame the Decision

Write a compact decision frame:

```markdown
### Decision Frame
- Question: <the choice to make>
- Context: <requirement/constraint causing the choice>
- Decision owner/reviewer: <if known>
- Reversibility: one-way | two-way | uncertain
- Affected contracts/components: <paths/docs/APIs>
- Evidence: <issue/docs/code/tests/runtime facts>
```

If the frame is vague, ask one focused clarification question before comparing
options.

### 2. Compare Options

Use this format:

```markdown
### Options

#### Option A — <name>
- Summary: ...
- Pros: ...
- Cons: ...
- Risks: ...
- Best when: ...

#### Option B — <name>
...
```

Include the current/default approach when it is a realistic option.

### 3. Recommend and Decide

State the recommendation and ask for a decision:

```markdown
### Recommendation
- Recommended option: <option>
- Rationale: <why this option fits current constraints>
- Consequences accepted: <trade-offs>
- What remains flexible: <two-way-door details>
```

After the user decides, record:

```markdown
### Decision
- Decision: <chosen option>
- Alternatives considered: <options>
- Consequences: <expected effects and constraints>
- Follow-up: <spikes/docs/tasks if any>
```

### 4. Decide Whether an ADR Is Needed

Create an ADR only when all are true:

- hard to reverse;
- architectural or boundary-setting;
- likely to matter in future maintenance;
- based on real alternatives;
- useful beyond this one ticket.

If any criterion is false, write:

```markdown
ADR: Not needed — <reason>
```

### 5. Write the ADR

Use `docs/decisions/NNNN-short-kebab-title.md`. Pick the next zero-padded ADR
number and never reuse numbers.

If the repository already has an ADR template, use it. Otherwise use
`references/adr-template.md` as the ADR format guide. The compact shape is:

```markdown
# ADR NNNN: <Title>

> Status: Accepted
> Date: YYYY-MM-DD
> Deciders: <names/roles if known>
> Related: <issue/doc links>

## Context

<Why this decision exists. Include constraints and forces, not implementation steps.>

## Decision

<The chosen option in 1-3 paragraphs.>

## Alternatives Considered

- <Option A>: <why rejected>
- <Option B>: <why rejected>

## Consequences

- <Positive consequence>
- <Trade-off accepted>
- <Constraint future work must respect>
```

Hard limits:

- about one page;
- no schema definitions;
- no code blocks;
- no task checklist;
- link to HLD/LLD/plans for mechanics instead of copying them.

## Output

Return:

```markdown
### Architecture Decision Result
- Decision: <chosen option>
- ADR: <path or "not needed — reason">
- Alternatives: <summary>
- Consequences: <summary>
- Flexible details left to implementation: <list>
- Follow-up/spike: <if any>
```
