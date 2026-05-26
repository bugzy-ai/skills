# Design Patterns

Use patterns as named solutions to recurring forces. Do not use them as decoration.

## Pattern Gate

Recommend a pattern only when all are true:

1. There is a named design force or smell.
2. The simpler direct solution is insufficient.
3. The pattern reduces coupling, duplication, or unsafe variation.
4. The codebase can verify the change.
5. The added concepts are worth their cognitive cost.

## Common Patterns

| Pattern | Use when | Avoid when |
| --- | --- | --- |
| Factory | Object creation has branching rules, invariants, or hidden concrete types. | Construction is a simple constructor call. |
| Strategy | Multiple interchangeable algorithms are current requirements. | There is only one behavior and no credible variation. |
| Adapter | External API, vendor SDK, or framework type would leak inward. | You are wrapping your own stable code with no translation. |
| Facade | A subsystem is complex and callers need a simpler task-oriented API. | The facade only forwards calls one-to-one. |
| Observer / Pub-Sub | Producers should not know all consumers; events can be asynchronous. | Caller needs immediate consistency or ordered transactional behavior. |
| Repository | Domain/application logic needs collection-like persistence access. | You are just renaming an ORM with no boundary value. |
| Dependency Injection | Policy should depend on abstractions; construction belongs at composition root. | Passing everything everywhere makes simple code harder to read. |
| Command | Requests need queueing, undo, logging, retries, or delayed execution. | A direct function call is enough. |
| Decorator | Behavior should be composed around a stable interface. | The wrapper leaks the wrapped object’s complexity. |
| Template Method | Algorithm skeleton is stable and subclasses vary steps. | Composition/Strategy would keep inheritance shallower. |

## Pattern Selection Examples

### Replace Conditional with Strategy

Use when a central conditional selects among algorithms and new variants are expected.

```text
ShippingCostCalculator
  ├─ StandardShippingStrategy
  ├─ ExpressShippingStrategy
  └─ PickupShippingStrategy
```

Do not introduce a strategy for two lines of code that will not vary.

### Adapter Around External Services

Use when third-party concepts would leak into your application or domain code.

```text
Application policy → PaymentGateway interface → StripePaymentAdapter → Stripe SDK
```

Keep SDK types, retries, auth, and vendor-specific errors inside the adapter.

### Repository Boundary

Use when persistence should not shape business logic.

Good repository methods speak domain/application language:

- `findPendingReviews(projectId)`
- `saveGeneratedDocument(document)`

Weak repository methods expose storage language:

- `selectFromTableWhereStatus(statusCode)`
- `updateJsonBlob(id, payload)`

## Pattern Anti-Patterns

- `FactoryFactory`, `Manager`, or `Service` classes with no clear responsibility.
- Interface per class by default.
- Pattern vocabulary replacing evidence: “use Strategy” without identifying the variation point.
- Observer/eventing used to hide synchronous business coupling.
- Repository wrapping every ORM method one-to-one.
- Facade that is only a pass-through method collection.

## Output Snippet

```markdown
Pattern considered: Adapter.
Force: Supabase storage signed URL details are leaking into UI-facing code.
Simpler option: inline helper in the route. Good enough if only one route uses it.
Recommendation: use an adapter only if multiple server actions/routes need the same ownership and URL policy.
Trade-off: one extra boundary, but storage policy becomes testable and centralized.
```
