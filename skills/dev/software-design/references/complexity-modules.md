# Complexity and Module Design

Use this reference for APIs, module boundaries, and complexity management.

## Complexity Signals

| Signal | Meaning | Design response |
| --- | --- | --- |
| Change amplification | A small change requires edits in many places. | Encapsulate the changing knowledge. |
| Cognitive load | Developers must remember too many details. | Simplify interfaces and push details down. |
| Unknown unknowns | It is unclear what must change or what matters. | Make dependencies, contracts, and ownership explicit. |

Complexity usually grows incrementally. Treat each small design decision as part of the long-term system shape.

## Deep vs Shallow Modules

A deep module provides substantial functionality behind a small, simple interface.

Good depth:

- Callers need few concepts.
- Implementation hides policy, formats, protocols, retries, caching, or invariants.
- The interface remains stable while internals change.

Shallow module warning signs:

- Wrapper methods that only pass through to another API.
- Many tiny classes that each add a name but little behavior.
- Interfaces that expose implementation details.
- Required parameters that force callers to know internal policy.

## Information Hiding

Hide design decisions likely to change:

- Data formats and serialization.
- Vendor SDK details.
- Storage layout and query strategy.
- Retry, timeout, cache, and consistency policies.
- Business invariants and validation rules.

Information leakage appears when the same design decision is reflected in multiple modules. Fix by moving the knowledge into one owner or merging modules that cannot be separated honestly.

## Interface Design

Prefer interfaces that are:

- Task-oriented, not implementation-oriented.
- Small in concept count, not necessarily small in line count.
- Explicit about contracts and failure modes.
- Hard to misuse.
- Stable around business meaning, not storage/framework details.

Ask: what is the simplest interface that covers current needs?

## Push Complexity Down

Lower-level modules should absorb detail so higher-level code stays simple.

Examples:

- A storage module chooses URL expiry and ownership checks instead of every caller doing it.
- A parser returns domain-shaped data instead of exposing raw file-format quirks.
- A retrying client translates transient vendor errors into application-level outcomes.

Do not push complexity down if it hides policy that callers must decide explicitly.

## Define Errors Out of Existence

Prefer designs that prevent invalid states:

- Value objects for validated concepts.
- Constructors/factories that enforce invariants.
- APIs that accept domain concepts instead of loose primitive combinations.
- Defaults and conventions that remove caller choices.

Still validate at trust boundaries: user input, network input, files, database rows, and external services.

## Comments as Design Documentation

Use comments/docs for information code cannot express:

- Interface contracts and invariants.
- Why a boundary exists.
- Non-obvious trade-offs.
- Cross-module assumptions.
- Operational constraints.

Delete comments that restate code.

## Critique Questions

- What knowledge does this module own?
- Can callers change less if the implementation changes?
- Is the interface simpler than the implementation?
- Are there pass-through methods or shallow wrappers?
- Are callers forced to know formats, protocols, or storage details?
- Would merging two modules reduce complexity more than another boundary?
