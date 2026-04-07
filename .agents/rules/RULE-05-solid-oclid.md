---
name: RULE-05-SOLID-OCLID
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-05 — SOLID: OCP + LSP + ISP + DIP

> **AI DIRECTIVE: These four principles govern how units relate to each other.
> Violating them creates fragile, untestable, change-resistant code.
> Apply all four on every design decision.**

---

## O — Open/Closed Principle (OCP)

> **Generate code that is OPEN for extension but CLOSED for modification.**
> New behavior is added by creating new code, not by editing existing code.

### When to Apply

Any time you see a **type-dispatch pattern** (if/switch on a type field) or when a
feature addition would require editing an existing class: OCP is being violated.

### The AI Must Replace Type Switches With Polymorphism

```
// WRONG — every new payment type requires editing this function
function calculateFee(payment) {
    if (payment.type === 'credit')      return payment.amount * 0.029
    else if (payment.type === 'debit')  return payment.amount * 0.015
    else if (payment.type === 'crypto') return payment.amount * 0.01
    // Adding "wire transfer" = EDITING this function = OCP violation
}

// CORRECT — new types extend without modifying existing code
interface PaymentMethod {
    calculateFee(amount: number): number
}

class CreditCard  implements PaymentMethod { calculateFee(a) { return a * 0.029 } }
class DebitCard   implements PaymentMethod { calculateFee(a) { return a * 0.015 } }
class Crypto      implements PaymentMethod { calculateFee(a) { return a * 0.01  } }
// Adding WireTransfer = new class only. Nothing existing changes.
```

### OCP Extension Patterns the AI Should Use

1. **Strategy** — inject behavior as a dependency (see DIP below)
2. **Plugin/Handler registration** — register new handlers into a list/map
3. **Template Method** — fix the skeleton, vary the steps via override/callback
4. **Event system** — emit events; new handlers subscribe without touching emitter

---

## L — Liskov Substitution Principle (LSP)

> **Every subtype must be fully substitutable for its base type.
> Callers must not be surprised by the behavior of a subtype.**

### The AI Must Never Generate These Patterns

```
// VIOLATION 1 — subtype throws where base type wouldn't
class ReadOnlyList extends List {
    add(item) {
        throw new Error("Not allowed")  // ← surprises callers who expect add() to work
    }
}

// VIOLATION 2 — instanceof checks in polymorphic code
function processShape(shape) {
    if (shape instanceof Circle) { /* special case */ }  // ← broken hierarchy
    else { shape.area() }
}

// VIOLATION 3 — method overridden to do nothing (weakens postcondition)
class NoOpLogger extends Logger {
    log(msg) { }  // ← silently ignores; callers expect logging to happen
}
```

### LSP Behavioral Contract Rules

The AI must verify every subtype satisfies:

| Contract           | Rule                                                   |
| ------------------ | ------------------------------------------------------ |
| **Preconditions**  | Subtype may only WEAKEN (accept more, not less)        |
| **Postconditions** | Subtype may only STRENGTHEN (guarantee more, not less) |
| **Invariants**     | All base class invariants must hold in subtype         |
| **Exceptions**     | Subtype must not throw where base wouldn't             |

### Fix: When LSP Is Violated, Restructure the Hierarchy

```
// WRONG — Square "is a" Rectangle breaks LSP (setWidth has unexpected side effect)
class Square extends Rectangle {
    setWidth(w)  { this.width = w; this.height = w }  // side effect!
    setHeight(h) { this.width = h; this.height = h }  // side effect!
}

// CORRECT — don't force the inheritance; use a common interface instead
interface Shape { area(): number }
class Rectangle implements Shape { area() { return this.width * this.height } }
class Square    implements Shape { area() { return this.side ** 2 } }
```

---

## I — Interface Segregation Principle (ISP)

> **No unit should be forced to depend on methods it doesn't use.
> Interfaces must be narrow and role-specific.**

### The AI Must Split Fat Interfaces

```
// WRONG — everything forced to implement everything
interface Worker {
    work():      void
    eat():       void   // robots don't eat
    sleep():     void   // robots don't sleep
    getPayroll():number // volunteers don't get paid
}

// CORRECT — segregated role interfaces
interface Workable  { work(): void }
interface Feedable  { eat(): void }
interface Sleepable { sleep(): void }
interface Paid      { getPayroll(): number }

// Each type implements only what applies to it:
// Human:   Workable + Feedable + Sleepable + Paid
// Robot:   Workable only
// Volunteer: Workable + Feedable + Sleepable (not Paid)
```

### ISP at Function Level

The AI must also apply ISP to function parameters:

```
// WRONG — forces caller to provide a full User just to get their email
function sendWelcome(user: User): void { mailer.send(user.email, "Welcome!") }

// CORRECT — depends only on what it needs
function sendWelcome(emailAddress: string): void { mailer.send(emailAddress, "Welcome!") }
```

### Granularity Rule

Group methods that are **always called together by the same caller**.
One method = one interface is too fine. Everything in one interface = too coarse.
Target: **role-based interfaces** where every consumer uses every method.

---

## D — Dependency Inversion Principle (DIP)

> **High-level modules must not import low-level modules.
> Both must depend on abstractions (interfaces/traits/protocols).
> Abstractions must be owned by the HIGH-level consumer, not the low-level implementation.**

### The AI Must Never Generate This in Business Logic

```
// WRONG — high-level service directly imports low-level concretion
import { MySQLOrderRepository } from './mysql-order-repository'
import { SendGridEmailService } from './sendgrid-email-service'

class OrderService {
    private repo  = new MySQLOrderRepository()   // hardcoded concrete
    private email = new SendGridEmailService()   // hardcoded concrete
}
// Switching DB or email provider = editing business logic = wrong

// CORRECT — depend on abstractions; inject implementations
interface OrderRepository { save(order): Promise<void> }
interface EmailService    { send(to, subject, body): Promise<void> }

class OrderService {
    constructor(
        private repo:  OrderRepository,  // interface injected
        private email: EmailService,     // interface injected
    ) {}
}
// Switching DB = swap implementation at the composition root only
```

### The Composition Root Rule

The AI must generate a **Composition Root** — one place (entry point / `main`) where all
concrete implementations are instantiated and injected:

```
// main.ts / main.go / main.rs / __main__.py — the ONLY place with `new ConcreteImpl()`
const repo    = new PostgresOrderRepository(dbConfig)
const email   = new SendGridEmailService(apiKey)
const service = new OrderService(repo, email)
// Everything else works through interfaces only
```

### Testing Benefit (the AI should communicate this)

DIP makes every class unit-testable with no real DB/network:

```
// Test uses lightweight fakes — no infrastructure needed
const fakeRepo  = new InMemoryOrderRepository()
const fakeEmail = new SpyEmailService()
const service   = new OrderService(fakeRepo, fakeEmail)
await service.placeOrder(testOrder)
assert(fakeRepo.orders.length === 1)
assert(fakeEmail.sentTo === testOrder.customerEmail)
```

---

## SOLID Combined Checklist

```
□ OCP: Does adding a new variant require editing an existing class?
       → If YES: extract polymorphism / handler registration
□ OCP: Is there a type-switch / if-chain dispatching on a type field?
       → Replace with polymorphism
□ LSP: Can every subtype replace its base without surprising callers?
       → If NO: restructure hierarchy, use shared interface instead
□ LSP: Does any subtype throw/return nothing where base type wouldn't?
       → Fix the behavioral contract
□ ISP: Does any implementor have to define methods it doesn't need?
       → Split the interface by role
□ ISP: Does a function's parameter carry more data than the function uses?
       → Narrow the parameter type
□ DIP: Does business logic import from concrete infrastructure?
       → Extract interface, inject via constructor
□ DIP: Is there a single Composition Root that owns all `new Concrete()` calls?
       → If NO: create one
```
