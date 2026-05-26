# Domain-Driven Design

Use DDD when the hard part is the business domain, not just framework structure.

## When DDD Helps

Use this lens when:

- Business terms are ambiguous or overloaded.
- The same word means different things in different parts of the system.
- Domain experts need to validate code concepts.
- Invariants and workflows are complex.
- Service/module boundaries should align to business capabilities.

Do not apply full DDD ceremony to CRUD-only or infrastructure-heavy code with little domain behavior.

## Ubiquitous Language

Code should use the language of the domain.

- Class/module/event names should be recognizable to domain experts.
- Avoid generic names where a domain concept exists.
- If a concept is hard to name, the model may be wrong.
- Update code when domain language changes.

## Bounded Contexts

A bounded context is a boundary where a model and language are consistent.

- The same term may have different meanings in different contexts.
- Translate between contexts explicitly.
- Use an anti-corruption layer for external or legacy models.
- Start with modular boundaries before service extraction.

Context boundaries often align with team ownership and change reasons.

## Entities, Value Objects, Aggregates

| Tactical pattern | Use when | Design rule |
| --- | --- | --- |
| Entity | Identity persists across state changes. | Equality by identity. |
| Value Object | Concept is defined by attributes. | Immutable; validate at creation. |
| Aggregate | Cluster must stay consistent together. | External code references the root only. |
| Domain Service | Domain behavior does not naturally belong to one entity/value object. | Keep it stateless and domain-focused. |

Keep aggregates small. Reference other aggregates by ID. Prefer eventual consistency across aggregate boundaries.

## Domain Events

Use domain events for facts the business cares about:

- Name in past tense: `DocumentGenerated`, `ProjectReviewCompleted`.
- Events are immutable facts.
- Publish only meaningful domain changes, not every database write.
- Use events to decouple follow-up reactions when immediate consistency is not required.

Distinguish internal domain events from integration events that cross system boundaries.

## Repositories and Factories

Repositories hide persistence behind collection-like methods in domain/application language.

Good:

- `findProjectsReadyForReview(userId)`
- `saveGenerationJob(job)`

Weak:

- `queryTableByStatus(status)`
- `updateRow(id, patch)`

Factories are useful when creation has invariants, branching, or coordination. Do not add a factory for trivial constructors.

## Strategic Design

Classify subdomains:

- **Core domain:** differentiating business capability. Invest in deep modeling.
- **Supporting subdomain:** necessary but not differentiating. Keep it clean and practical.
- **Generic subdomain:** commodity. Prefer existing services/libraries.

Do not over-model generic functionality.

## DDD Review Checklist

- Do names match domain language?
- Are context boundaries explicit?
- Are external models translated before entering the core domain?
- Are invariants enforced inside entities/value objects/aggregates?
- Are aggregates small and consistent?
- Are domain events meaningful to the business?
- Is the core domain receiving the most design attention?
