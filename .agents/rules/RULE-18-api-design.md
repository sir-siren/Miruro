---
name: RULE-18-API-DESIGN
type: ai-behavioral-directive
applies-to: ALL languages — public APIs, HTTP APIs, library interfaces, module boundaries
---

# RULE-18 — API & Interface Design

> **AI DIRECTIVE: An API is a contract with its users. Once published, breaking it has a cost.
> Design APIs to be minimal, predictable, hard to misuse, and easy to extend without breaking.**

---

## Core API Design Principles

```
EASY TO USE CORRECTLY:    Obvious defaults, self-explanatory names, type safety
HARD TO MISUSE:           Impossible states unrepresentable, required args enforced
MINIMAL:                  Expose the minimum surface needed; add later if needed
CONSISTENT:               Same concepts named and behaved the same way everywhere
EXTENSIBLE WITHOUT BREAK: Adding behavior doesn't require changing call sites
```

---

## Rule 18.1 — Principle of Least Surprise

The API does what callers expect. No hidden side effects. No surprise mutations.

```
// WRONG — name says "get", but it mutates
function getOrCreateUser(email) {
    let user = db.findByEmail(email)
    if (!user) user = db.create({ email })  // SURPRISE: side effect in a getter
    return user
}

// CORRECT — name reveals the full behavior
function findOrCreateUser(email) { ... }
// OR split into two separate, composable operations:
function findUser(email) { ... }
function createUser(email) { ... }
```

---

## Rule 18.2 — Make Illegal States Unrepresentable at the Type Level

The best validation is the one enforced by the compiler. Design types so wrong usage
is a type error, not a runtime error.

```
// WRONG — all these calls are valid at compile time but wrong at runtime
sendEmail("", subject, body)         // empty address
createOrder(userId, [])              // empty items
transferFunds(toId, fromId, amount)  // IDs swapped — silent bug

// CORRECT — encode constraints in types
type NonEmptyString = string & { __nonEmpty: true }
type NonEmptyArray<T> = [T, ...T[]]

// Branded types prevent swapping IDs
type UserId    = string & { __brand: 'UserId' }
type AccountId = string & { __brand: 'AccountId' }

function transferFunds(from: AccountId, to: AccountId, amount: Money): void { ... }
// transferFunds(userId, accountId, ...)  ← TYPE ERROR — caught at compile time
```

---

## Rule 18.3 — Options Objects for Complex APIs

When a function or constructor has more than 3 parameters, use an options object.
This makes call sites self-documenting and future-extensible without breaking callers.

```
// WRONG — positional args; meaning opaque at call site
createServer("0.0.0.0", 8080, true, 30, 100, "./logs")

// CORRECT — named options; every call site is self-documenting
createServer({
    host:       "0.0.0.0",
    port:       8080,
    tlsEnabled: true,
    timeoutSec: 30,
    maxConns:   100,
    logDir:     "./logs",
})

// Extending in future: just add new optional field — NO breaking change
createServer({
    host: "0.0.0.0",
    port: 8080,
    // New field: callers who don't set it get the default
    gracefulShutdownSec: 10,
})
```

---

## Rule 18.4 — Return Types Must Be Explicit and Honest

```
// WRONG — caller can't tell what they'll get
function processOrder(order) { ... }        // returns what? Order? void? boolean?
function findUser(id) { return user }       // can it return null? undefined?

// CORRECT — explicit, honest return type
function processOrder(order: Order): ProcessedOrder { ... }
function findUser(id: UserId): User | null { ... }    // caller KNOWS it might be null
async function createOrder(cmd: CreateOrderCommand): Promise<Order> { ... }

// In Rust: Result<T, E> for fallible operations — caller MUST handle both cases
fn find_user(id: &UserId) -> Option<User>
fn create_order(cmd: &CreateOrderCommand) -> Result<Order, OrderError>

// In Go: always (T, error) for fallible operations
func FindUser(id string) (*User, error)
func CreateOrder(cmd CreateOrderCommand) (*Order, error)
```

---

## Rule 18.5 — HTTP API Design Rules

When generating HTTP API endpoints:

```
// Resource naming
GET    /orders              ← collection
GET    /orders/:id          ← single resource
POST   /orders              ← create
PUT    /orders/:id          ← full replace
PATCH  /orders/:id          ← partial update
DELETE /orders/:id          ← delete

// WRONG — verb in URL (REST anti-pattern)
POST /createOrder
GET  /getOrderById/:id
POST /orders/cancel

// CORRECT — verb is the HTTP method
POST   /orders              ← create
GET    /orders/:id          ← get
POST   /orders/:id/cancel   ← action (noun + verb is acceptable for state transitions)

// Status codes: always use the right one
200 OK             ← success with body
201 Created        ← resource created (include Location header)
204 No Content     ← success, no body (DELETE, certain PATCHes)
400 Bad Request    ← client error (validation failed)
401 Unauthorized   ← not authenticated
403 Forbidden      ← authenticated but not authorized
404 Not Found      ← resource doesn't exist
409 Conflict       ← state conflict (duplicate, version mismatch)
422 Unprocessable  ← semantically invalid (business rule violation)
500 Internal Error ← server bug (never expose stack traces)

// Consistent error body — always the same shape
{
    "code":      "ORDER_NOT_FOUND",     // machine-readable
    "message":   "Order ord-123 not found",  // human-readable
    "requestId": "req-abc-456",         // for tracing
    "details":   { "field": "reason" }  // optional, for validation errors
}
```

---

## Rule 18.6 — Versioning and Breaking Changes

```
// A breaking change is:
// - Removing a field from a response
// - Renaming a field
// - Changing a field's type
// - Adding a REQUIRED request field
// - Changing HTTP method or URL path
// - Changing status code semantics

// A non-breaking change is:
// - Adding a new OPTIONAL request field (with a default)
// - Adding a new field to a response
// - Adding a new endpoint
// - Adding new enum values (carefully — clients must handle unknown values)

// When a breaking change is unavoidable:
// - Version the API: /api/v2/orders
// - Keep v1 alive during the deprecation period
// - Communicate deprecation via response headers: Deprecation: true
//   Sunset: Sat, 01 Jan 2027 00:00:00 GMT
```

---

## Rule 18.7 — Library/Module Public API Rules

```
// Expose minimum surface area — everything is private by default
// Only export what external consumers genuinely need

// WRONG — exports implementation details
export { OrderMapper }          // internal utility — not for consumers
export { buildQueryParams }     // internal helper — not for consumers
export { PostgresOrderRepo }    // concrete impl — consumers should use the interface

// CORRECT — export only the public contract
export type { Order, OrderId, CreateOrderInput }   // types
export { OrderService }                            // main service
export { OrderNotFoundError, OrderValidationError } // error types callers might catch

// The test: if a consumer would be broken by an internal refactor → it shouldn't be exported
```

---

## API Design Checklist

```
□ Does every function/endpoint do what its name says — nothing more, nothing hidden?
□ Are illegal argument combinations prevented by types, not runtime checks?
□ Are options objects used for 4+ parameters?
□ Are return types explicit and honest about nullability/failure?
□ For HTTP: are the right status codes and consistent error shapes used?
□ Does the API expose the minimum surface needed?
□ Are internal implementation details unexported?
□ Is the API versioned or designed to be extended without breaking callers?
□ Are deprecated endpoints/methods marked and communicated?
```
