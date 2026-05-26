# Architecture Boundaries

Use this reference for Clean Architecture, ports/adapters, dependency direction, and component boundaries.

## Dependency Rule

Source dependencies should point toward stable policy and away from volatile details.

Typical direction:

```text
UI / routes / controllers → application use cases → domain policy
infrastructure adapters → application ports / domain contracts
composition root wires concrete implementations
```

Inner policy should not import framework, database, storage, network, or UI types.

## Layers as Responsibilities

| Layer / Area | Responsibility | Should avoid |
| --- | --- | --- |
| Domain | Core business rules, invariants, value objects, entities. | Frameworks, persistence, HTTP, UI. |
| Application | Use cases, orchestration, authorization checks, transaction boundaries. | Rendering, ORM details, vendor SDKs. |
| Interface adapters | Translate between external formats and application/domain formats. | Business rules that belong inward. |
| Infrastructure | Databases, storage, AI calls, external APIs, queues, frameworks. | Owning business policy. |

Layer count is flexible. The rule matters more than the diagram.

## Ports and Adapters

Define a port when a policy needs a capability whose implementation is a detail:

```text
GeneratePermitUseCase → DocumentRenderer port → DocxRenderer adapter
GeneratePermitUseCase → SourceFileStore port → SupabaseStorage adapter
```

A port is useful when it:

- Protects policy from volatile infrastructure.
- Makes important behavior testable.
- Represents a business/application capability, not a vendor method.

Avoid ports that only rename a concrete class with no stability or testing value.

## Boundary-Crossing Data

Data crossing inward should be simple and convenient for the inner layer.

- Do not pass ORM entities, HTTP request objects, or SDK response types into domain/application policy.
- Translate at the boundary.
- Keep DTOs explicit when they clarify contracts.
- Avoid DTO proliferation when the boundary is not real.

## Component Boundaries

Group code that changes together and is reused together.

Checks:

- No circular dependencies.
- Public API is intentional and small.
- Imports reveal the intended dependency direction.
- Modules scream business capability, not just framework layer names.
- Stable modules expose abstractions; volatile modules depend on them.

## Monolith First

A well-structured monolith is usually simpler than premature services.

Split deployment boundaries only when there is evidence:

- Independent scaling need.
- Independent team ownership and release cadence.
- Fault isolation requirement.
- Security/data boundary.
- Operational maturity to handle distributed systems.

A microservice with shared database tables and tight sync calls is a distributed monolith.

## Boundary Review Checklist

- Can business rules be tested without a database, web server, or external service?
- Can infrastructure change without rewriting policy?
- Are authorization and ownership checks enforced server-side at mutation/read boundaries?
- Do imports point inward?
- Are external types translated at the edge?
- Does the composition root own wiring?
- Are boundaries paying for themselves?
