---
name: RULE-06-STATE-IMMUTABILITY
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-06 — State & Immutability

> **AI DIRECTIVE: Default to immutable. Mutation must be the explicit, justified exception.
> Every shared mutable state is a potential concurrency bug, a debugging nightmare,
> and a hidden dependency between unrelated parts of the system.**

---

## The Core Rule

```
IMMUTABILITY HIERARCHY (prefer top, justify bottom):
1. Immutable value (no mutation ever)           ← ALWAYS prefer
2. Local mutable (mutation contained in one fn) ← OK
3. Object with controlled mutation (encapsulated) ← OK with encapsulation
4. Shared mutable state                          ← JUSTIFY EXPLICITLY
5. Global mutable state                          ← BANNED (see below)
```

---

## Rule 6.1 — Default to Immutable Bindings

In every language, use the immutable binding by default. Opt into mutation only when necessary.

```
// JS/TS: const over let. let only when reassignment is truly needed.
const userId = "usr-123"        // CORRECT
let   userId = "usr-123"        // WRONG — unless userId is later reassigned

// Rust: let (immutable) is default. let mut only when mutation needed.
let price = 100           // CORRECT
let mut total = 0         // OK — accumulator needs mutation

// Go: use := but declare intent; prefer not reassigning variables
const maxRetries = 3      // CORRECT for true constants

// Python: use variables functionally; prefer new names over mutation
# WRONG
result = []
result.append(transform(x))   # mutating accumulator
# CORRECT for simple cases
result = [transform(x) for x in items]

// Zig: const by default, var only when mutation needed
const buffer_size = 4096  // CORRECT
var   counter = 0         // OK — when mutation needed
```

---

## Rule 6.2 — Data Transformations Return New Values, Never Mutate Input

```
// WRONG — mutates the input; caller is surprised
function applyDiscount(order, rate) {
    order.total = order.total * (1 - rate)   // modifies caller's object!
    order.discountApplied = true
    return order
}

// CORRECT — returns a new value; original is untouched
function applyDiscount(order, rate) {
    return {
        ...order,
        total:           order.total * (1 - rate),
        discountApplied: true,
    }
}
// In Rust: return a new struct value
// In Go: return a new copy of the struct
// In Zig: return new struct literal
```

---

## Rule 6.3 — Immutable Arrays / Collections — Use Pure Operations

The AI must use non-mutating operations when transforming collections:

| Mutating (AVOID)  | Pure equivalent (USE)                  |
| ----------------- | -------------------------------------- |
| `arr.push(x)`     | `[...arr, x]`                          |
| `arr.pop()`       | `arr.slice(0, -1)`                     |
| `arr.splice(i,1)` | `arr.filter((_, idx) => idx !== i)`    |
| `arr.sort()`      | `[...arr].sort()`                      |
| `arr.reverse()`   | `[...arr].reverse()`                   |
| `arr[i] = x`      | `arr.map((v, i_) => i_ === i ? x : v)` |
| `dict[k] = v`     | `{ ...dict, [k]: v }`                  |

Language note: In Rust, Python, Go, Zig — the compiler or runtime enforces this through
ownership/immutability. Apply the same principle: transformations produce new values.

---

## Rule 6.4 — Pure Functions Are Preferred

A pure function:

1. Returns the same output for the same input — always
2. Has no side effects — no I/O, no mutation of external state

```
// IMPURE — depends on external mutable state
let discount = 0.1
function getDiscountedPrice(price) {
    return price * (1 - discount)  // depends on external `discount`
}

// PURE — everything it needs is in the parameters
function getDiscountedPrice(price, discountRate) {
    return price * (1 - discountRate)  // same input = same output, always
}
```

The AI must separate pure logic from impure I/O:

- **Pure core**: business rules, calculations, transformations — no I/O
- **Impure shell**: database reads/writes, network calls, file I/O — at the edges only

---

## Rule 6.5 — Value Objects Are Immutable

Any object representing a **domain concept without identity** (Money, Address, DateRange,
Color, etc.) must be immutable:

```
// Pseudocode — apply in target language

// WRONG — mutable Money object is a concurrency and logic nightmare
class Money {
    amount: number
    add(other: Money) {
        this.amount += other.amount  // mutates! confusing when shared
    }
}

// CORRECT — every operation returns a new value
class Money {
    private constructor(readonly amount: number, readonly currency: string) {}

    static of(amount: number, currency: string): Money {
        if (amount < 0) throw new NegativeAmountError()
        return new Money(amount, currency)
    }

    add(other: Money): Money {
        assertSameCurrency(this, other)
        return new Money(this.amount + other.amount, this.currency)
    }
    // No setters. No mutation. Every operation = new value.
}
```

---

## Rule 6.6 — Encapsulate All Mutable State

When mutation is necessary, it must be **fully encapsulated** behind a controlled interface.
No external code should be able to directly modify internal state.

```
// WRONG — public mutable fields; anyone can corrupt the state
class BankAccount {
    balance: number = 0        // direct access = bypasses all business rules
    transactions: any[] = []   // can be pushed to by anyone
}
account.balance -= 5000        // bypasses overdraft protection!

// CORRECT — mutation only through validated business operations
class BankAccount {
    private _balance: number = 0
    private _transactions: Transaction[] = []

    get balance(): number { return this._balance }

    deposit(amount: number): void {
        assertPositive(amount, "deposit amount")
        this._balance += amount
        this._transactions.push(Transaction.deposit(amount))
    }

    withdraw(amount: number): void {
        assertPositive(amount, "withdrawal amount")
        if (amount > this._balance) throw new InsufficientFundsError()
        this._balance -= amount
        this._transactions.push(Transaction.withdrawal(amount))
    }
}
```

---

## Rule 6.7 — No Global Mutable State

Global mutable state is **banned** in production code. It creates invisible coupling,
makes testing impossible, and causes race conditions in concurrent environments.

```
// BANNED in all languages
let currentUser = null         // global mutable — any code can change it
global.config = {}             // global mutable — race condition in async code
var globalCache = {}           // global mutable — shared across all requests

// CORRECT alternatives:
// - Pass state as parameters (functional)
// - Use dependency injection (OOP)
// - Use request-scoped context (web servers)
// - Use thread-local / task-local storage (concurrent systems)
```

---

## AI Self-Check for State & Immutability

```
□ Are all bindings immutable by default (const/let vs var, let vs let mut)?
□ Do transformations return new values instead of mutating inputs?
□ Are collection operations non-mutating?
□ Are value objects (Money, Address, etc.) immutable (no setters)?
□ Are pure functions separated from impure I/O?
□ Is all mutable state encapsulated behind a controlled interface?
□ Is there any global mutable state? → eliminate it
□ Can two concurrent executions corrupt each other through shared state?
```
