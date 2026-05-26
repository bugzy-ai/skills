# Simplicity Principles

Use this reference to keep design advice practical. The best design is the simplest one that handles current requirements and credible change pressure.

## KISS

Prefer direct, boring code over clever indirection.

Ask:

- Can a new contributor explain this after reading one file?
- Does this abstraction remove more complexity than it adds?
- Is the framework/layer/pattern solving a current problem?
- Can the design be verified with existing tests/builds?

## YAGNI

Do not build for imagined future requirements.

Reject:

- Configuration points with no current caller.
- Interfaces created only because “we may swap this later.”
- Generic type parameters, plugin systems, or factories without a second concrete use or a volatile boundary.
- New services, queues, caches, or background jobs without measured need or explicit product requirement.

Accept flexibility when:

- The boundary is already volatile.
- Two current implementations are required.
- Tests need a seam around I/O or time.
- Security, compliance, or deployment constraints require isolation.

## DRY as Knowledge, Not Syntax

DRY means one authoritative representation of each piece of knowledge.

Do not merge two similar-looking code blocks if they represent different business rules or may change for different reasons.

Use the Rule of Three:

1. First occurrence: write it clearly.
2. Second occurrence: notice the similarity.
3. Third occurrence: extract if it is the same knowledge.

## Reversibility

Prefer decisions that can be changed cheaply:

- Keep third-party APIs at the edge.
- Avoid leaking vendor-specific types into domain or application logic.
- Use small adapters around infrastructure when the dependency is likely to change.
- Defer expensive irreversible decisions until evidence justifies them.

## Contracts and Invariants

A simple design makes invalid states hard to represent.

- Validate untrusted input at system boundaries.
- Enforce business invariants in the module that owns the business concept.
- Prefer explicit types/value objects for concepts that carry rules.
- Use assertions or tests for internal states that should be impossible.

## Simplicity Gate

Before recommending any new abstraction, answer:

1. What current complexity does it remove?
2. What current variation does it support?
3. What code will become shorter, safer, or easier to test?
4. What simpler option was considered?
5. How will we know the new abstraction paid for itself?
