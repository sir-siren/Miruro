---
name: RULE-13-CODE-SMELLS
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-13 — Code Smell Detection & Remediation

> **AI DIRECTIVE: When generating, reviewing, or refactoring code, actively scan for these
> patterns. When detected, do not proceed without flagging the smell and applying the fix.
> A smell is not a bug — it is a warning that a bug or maintenance problem is nearby.**

---

## Smell Detection Protocol

When the AI encounters any of the following patterns, it must:

1. **Name the smell** explicitly
2. **Explain why it's problematic**
3. **Apply the refactoring** or propose it clearly

---

## Category 1 — BLOATERS (Things That Got Too Big)

### Long Method / Function

**Detect:** > 20 lines OR multiple levels of abstraction OR "and" in description
**Fix:** Extract Method — pull sub-operations into named functions

### Large Class / Module

**Detect:** > 300 lines OR imports from 5+ unrelated domains OR low internal cohesion
**Fix:** Extract Class — identify cohesion groups and separate them

### Long Parameter List

**Detect:** > 3 positional parameters
**Fix:** Introduce Parameter Object / Options Struct

```
// SMELL: 5 positional parameters
createUser("John", "Doe", "john@example.com", true, "admin")

// FIX:
createUser({ firstName: "John", lastName: "Doe", email: "john@example.com",
             sendWelcome: true, role: "admin" })
```

### Data Clumps

**Detect:** Same 3+ variables always appear together in function signatures or data structures
**Fix:** Extract into a Value Object / Struct

```
// SMELL: city, state, zip always travel together
function shipTo(street, city, state, zip) { ... }
function validateAddress(city, state, zip) { ... }

// FIX: Extract Address value object
function shipTo(address: Address) { ... }
function validateAddress(address: Address) { ... }
```

### Primitive Obsession

**Detect:** Raw primitives used for domain concepts (string for userId, number for money)
**Fix:** Replace with Value Objects / Branded/NewType types

```
// SMELL: raw string IDs everywhere — easy to pass wrong one
function transfer(fromAccount: string, toAccount: string, amount: number) { ... }

// FIX: typed domain primitives
function transfer(from: AccountId, to: AccountId, amount: Money) { ... }
```

---

## Category 2 — OO ABUSERS

### Switch / If-Else Chain on Type

**Detect:** `switch/if-else` dispatching on a `.type`, `.kind`, or `.category` field
**Fix:** Replace Conditional with Polymorphism (see RULE-05-OCP)

### Refused Bequest

**Detect:** Subclass inherits from parent but throws `NotImplemented` or does nothing for inherited methods
**Fix:** Replace Inheritance with Delegation; or restructure hierarchy

### Temporary Field

**Detect:** Instance variable that's only valid during one method and `null/undefined` otherwise
**Fix:** Extract the temporary into the method parameters or a local data class

---

## Category 3 — CHANGE PREVENTERS

### Divergent Change

**Detect:** One class is modified for multiple unrelated reasons (SRP violation)
**Fix:** Extract Class by change-reason groups

### Shotgun Surgery

**Detect:** One logical change requires editing 5+ different files/classes
**Fix:** Move Method / Move Field to consolidate related logic

### Parallel Inheritance Hierarchies

**Detect:** Every time you add a subclass to hierarchy A, you must add one to hierarchy B
**Fix:** Collapse one hierarchy using delegation

---

## Category 4 — DISPENSABLES (Things That Shouldn't Exist)

### Dead Code

**Detect:** Functions never called, variables never read, `if (false)`, unreachable branches
**Fix:** DELETE IT. Git preserves history.

```
// SMELL — never reached
if (FEATURE_FLAG_THAT_IS_ALWAYS_FALSE) {
    doLegacyBehavior()
}

// FIX: delete it. If you need it someday, git history has it.
```

### Speculative Generality

**Detect:** Abstract hooks, unused parameters, extra layers "just in case"
**Fix:** YAGNI — delete until actually needed

```
// SMELL: plugin system with one plugin, abstract factory with one product
interface AnalyticsPlugin { ... }
class AnalyticsPluginRegistry { ... }
// Reality: there's one analytics provider. This complexity is unused.

// FIX: just call the analytics provider directly until a second one is needed
```

### Duplicate Code

**Detect:** Same logic in 2+ locations (see DRY in RULE-10)
**Fix:** Extract Function / Extract Module

### Data Class (Anemic Object)

**Detect:** Class with only getters/setters, no behavior — all logic lives in external "service" classes
**Fix:** Move the logic that manipulates the data INTO the data class

```
// SMELL: Order is a data bag; all behavior in OrderService
class Order { id; status; items; total }
class OrderService {
    confirm(order)        { order.status = 'confirmed' }
    calculateTotal(order) { return order.items.reduce(...) }
}

// FIX: behavior belongs with data
class Order {
    confirm()         { this.status = 'confirmed' }
    calculateTotal()  { return this.items.reduce(...) }
}
```

---

## Category 5 — COUPLERS

### Feature Envy

**Detect:** A method that uses another class's data more than its own
**Fix:** Move Method to the class whose data it uses

```
// SMELL: OrderFormatter envies Order's data
class OrderFormatter {
    format(order) {
        const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0)
        const tax      = subtotal * order.taxRate
        return `${order.customerName}: ${subtotal + tax}`  // all Order data
    }
}

// FIX: move to Order where the data lives
class Order {
    format() {
        return `${this.customerName}: ${this.calculateTotal()}`
    }
    calculateTotal() { ... }
}
```

### Inappropriate Intimacy

**Detect:** Class A directly accesses private fields/methods of class B
**Fix:** Encapsulate the field; Move Method; introduce a mediator

### Message Chains (Train Wreck)

**Detect:** `a.getB().getC().getD().doWork()` — more than 2 dots
**Fix:** Hide Delegate / Move Method; Tell Don't Ask

```
// SMELL
user.getAddress().getCity().getPostalCode()

// FIX
user.getPostalCode()  // User delegates to Address internally
```

### Middle Man

**Detect:** A class where 90%+ of methods just forward to another class
**Fix:** Remove Middle Man — inline the delegation or eliminate the class

---

## Smell Quick-Reference Card

| Smell                  | Signal                     | Fix                          |
| ---------------------- | -------------------------- | ---------------------------- |
| Long Method            | > 20 lines / "and" in desc | Extract Method               |
| Large Class            | > 300 lines / low cohesion | Extract Class                |
| Long Params            | > 3 positional             | Options Object               |
| Data Clumps            | Same vars always together  | Value Object                 |
| Primitive Obsession    | string/int for domain IDs  | NewType / Branded            |
| Type Switch            | `if type === 'X'` chain    | Polymorphism                 |
| Refused Bequest        | throws NotImplemented      | Composition over inheritance |
| Dead Code              | Never reached              | DELETE                       |
| Speculative Generality | "Just in case" hooks       | YAGNI — delete               |
| Duplicate Code         | Logic in 3+ places         | Extract + DRY                |
| Data Class             | No behavior, only data     | Move behavior to class       |
| Feature Envy           | Uses another class's data  | Move Method                  |
| Message Chains         | `a.b().c().d()`            | Tell Don't Ask               |
| Middle Man             | 90% delegations            | Remove                       |
