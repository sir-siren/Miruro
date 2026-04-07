---
name: RULE-21-DEPENDENCIES
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-21 — Dependencies & Module Boundaries

> **AI DIRECTIVE: Every dependency is a liability. Every module boundary is a contract.
> Manage both with intention. Depend on as little as possible. Define boundaries explicitly.
> Circular dependencies are always a design error.**

---

## Rule 21.1 — No Circular Dependencies — Ever

Circular dependencies indicate a missing abstraction. They make code impossible to
test in isolation and create initialization-order bugs.

```
// WRONG — circular dependency
// order.ts imports from user.ts
// user.ts imports from order.ts
// → Neither can be tested independently

// FIX — break the cycle with a shared abstraction or by extracting the shared part
// Approach A: Extract a shared types/interfaces module that both depend on
// order-types.ts  ← no dependencies
// user-types.ts   ← no dependencies
// order.ts        ← imports order-types.ts and user-types.ts
// user.ts         ← imports user-types.ts and order-types.ts

// Approach B: Move the shared behavior to a third module
// shared/customer-summary.ts  ← extracts the shared concept
// order.ts   ← imports customer-summary.ts
// user.ts    ← imports customer-summary.ts
```

---

## Rule 21.2 — Dependency Direction Must Be Explicit and Acyclic

```
// Module dependency graph must be a DAG (Directed Acyclic Graph)

// CORRECT dependency direction (onion/layered architecture):
domain/          ← depends on nothing external
application/     ← depends on domain only
infrastructure/  ← depends on domain + application
api/             ← depends on application
main/            ← depends on everything (composition root only)

// The Stable Dependencies Principle:
// Depend on modules that are MORE stable than you.
// Stable = many dependents, few dependencies of its own.
// Unstable = few dependents, many dependencies.
```

---

## Rule 21.3 — Minimal External Dependencies

Every external dependency added to a project:

- Increases attack surface (security vulnerabilities)
- Creates upgrade maintenance burden
- Risks supply chain attacks
- Can be abandoned or become incompatible

```
// Before adding a dependency, ask:
□ Can this be solved with < 20 lines of standard library code?
□ Is this dependency actively maintained?
□ Does it have a security track record?
□ What happens if it is abandoned?
□ Is it adding a large transitive dependency tree for a small feature?

// Examples of dependencies worth their cost:
// - Crypto: bcrypt, argon2 (complex, security-critical)
// - DB drivers: pg, sqlx (complex infrastructure)
// - Validation: zod, serde (complex parsing with good ergonomics)

// Examples of dependencies that are NOT worth their cost:
// - left-pad, is-odd (trivially solved with std lib)
// - lodash entirely (use native array/object methods)
// - moment.js (heavy; use Temporal / date-fns / stdlib)
```

---

## Rule 21.4 — Pin Dependency Versions in Production

```
// WRONG — range specifiers allow silent breaking changes
"dependencies": {
    "express": "^4.0.0",   // could silently upgrade to 4.99 with breaking behavior
    "zod":     "~3.0.0",
}

// CORRECT — pin exact versions in lockfile; use ranges in published libraries only
// package.json / Cargo.toml / go.mod / pyproject.toml:
// Application: use lockfile (package-lock.json, Cargo.lock, go.sum, uv.lock)
// Library: use ranges, but document minimum tested version

// Always commit lockfiles for applications
// Never commit lockfiles for libraries (let consumer resolve)
```

---

## Rule 21.5 — Module Boundaries Must Be Explicit

A module's public API should be declared explicitly. Everything internal is private.

```
// WRONG — everything exported by default
// lib/orders/order.ts     — exports Order, OrderItem, OrderMapper, dbHelpers, rawSQL
// Everything internal is accessible to everyone

// CORRECT — explicit public API via barrel file
// lib/orders/index.ts (or mod.rs in Rust, package.go in Go)
export type { Order, OrderId, CreateOrderInput }   // public types
export { OrderService }                            // public service
export { OrderNotFoundError, OrderValidationError } // errors callers catch

// NOT exported (internal implementation details):
// OrderMapper, buildOrderQuery, PostgresOrderRepository, ...

// Rule: if removing an export would break an external caller → it's public API
// If not → it should be private (unexported)
```

---

## Rule 21.6 — Avoid God Imports / Barrel Barrel Re-Exports

```
// WRONG — one barrel re-exports everything from 20 sub-modules
// src/index.ts
export * from './auth'
export * from './orders'
export * from './payments'
export * from './users'
export * from './notifications'
export * from './reporting'
// Result: 300+ exports; consumers get everything even when they need one function;
// tree-shaking is impeded; circular dependency risk is high

// CORRECT — barrel exports only at feature boundary, minimal surface
// src/orders/index.ts  → exports public API of the orders feature only
// src/users/index.ts   → exports public API of the users feature only
// Consumers import from the specific feature barrel, not a mega-root barrel
```

---

## Rule 21.7 — Dependency Injection Over Service Locator

```
// WRONG — Service Locator (hidden dependency, untestable)
class OrderService {
    processOrder(order) {
        const db    = ServiceLocator.get('database')    // hidden dependency
        const email = ServiceLocator.get('emailService') // hidden dependency
        db.save(order)
        email.send(order.customer.email, "Confirmed")
    }
}
// Dependencies are hidden — you can't tell what this class needs without reading body

// CORRECT — Constructor Injection (explicit, testable)
class OrderService {
    constructor(
        private readonly repo:  OrderRepository,   // explicit
        private readonly email: EmailService,      // explicit
    ) {}

    processOrder(order) {
        this.repo.save(order)
        this.email.send(order.customer.email, "Confirmed")
    }
}
// Dependencies are explicit — caller knows exactly what's needed to construct this
```

---

## Rule 21.8 — Dependency Update Discipline

```
// Categorize updates:
// PATCH (1.0.x → 1.0.y): usually safe; apply promptly (especially security patches)
// MINOR (1.x.0 → 1.y.0): review changelog; should be non-breaking by semver
// MAJOR (x.0.0 → y.0.0): breaking change; plan migration; test thoroughly

// Process for any dependency update:
1. Read the CHANGELOG / release notes
2. Check for known CVEs: npm audit / cargo audit / pip audit / govulncheck
3. Run full test suite after update
4. Deploy to staging first
5. Monitor after production deployment

// Automate security patch detection:
// - GitHub Dependabot
// - npm audit in CI
// - cargo audit in CI
// - govulncheck in CI
```

---

## Dependencies Checklist

```
□ Are there any circular dependencies? (use madge / cargo-modules / go-mod-graph)
□ Does dependency flow in one direction only (inner layers don't import outer layers)?
□ Is every new dependency justified vs. a stdlib solution?
□ Are production dependencies pinned via a lockfile?
□ Are module public APIs explicitly declared — not "everything is exported"?
□ Are dependencies injected (not located via service locator or global registry)?
□ Are security vulnerabilities checked in CI (audit / govulncheck)?
□ Is the mega-barrel-export pattern avoided?
```
