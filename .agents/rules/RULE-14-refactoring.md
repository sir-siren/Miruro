---
name: RULE-14-REFACTORING
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-14 — Refactoring Discipline

> **AI DIRECTIVE: Refactoring is behavior-preserving restructuring. Never refactor and
> add features simultaneously. Each refactoring step must be atomic, safe, and verifiable.
> Apply the Boy Scout Rule: always leave the code cleaner than you found it.**

---

## The Refactoring Protocol

The AI must follow this sequence whenever refactoring is requested or needed:

```
1. Confirm tests are GREEN before starting
2. Make ONE small, named refactoring
3. Verify tests are still GREEN
4. Commit with a descriptive message: "refactor: <what changed>"
5. Repeat from step 2

NEVER:
  - Mix refactoring with feature changes in the same step
  - Refactor without a passing test suite
  - Make multiple refactorings without verifying between them
```

---

## Rule 14.1 — The Core Refactoring Catalog

The AI must apply these by name and apply them correctly:

### Extract Function / Method

**When:** A code fragment can be given a meaningful name
**How:** Pull it out; name it what it does; pass required data as parameters

```
// BEFORE
function printOwing(invoice) {
    // print banner
    console.log('***********************')
    console.log('***** Customer Owes ****')
    // calculate total
    let outstanding = invoice.orders.reduce((s, o) => s + o.amount, 0)
    // print details
    console.log(`customer: ${invoice.customer}`)
    console.log(`amount: ${outstanding}`)
}

// AFTER
function printOwing(invoice) {
    printBanner()
    const outstanding = calculateOutstanding(invoice)
    printDetails(invoice, outstanding)
}
function printBanner() {
    console.log('***********************')
    console.log('***** Customer Owes ****')
}
function calculateOutstanding(invoice) {
    return invoice.orders.reduce((s, o) => s + o.amount, 0)
}
function printDetails(invoice, outstanding) {
    console.log(`customer: ${invoice.customer}`)
    console.log(`amount: ${outstanding}`)
}
```

### Rename (Variable / Function / Class)

**When:** The current name doesn't reveal intent
**How:** Use IDE "Rename Symbol" — never find-and-replace manually

```
// BEFORE
function calc(d, t) { return d / t }

// AFTER
function calculateSpeed(distanceMeters, timeSeconds) {
    return distanceMeters / timeSeconds
}
```

### Replace Magic Literal With Named Constant

**When:** A number or string appears with no explanation

```
// BEFORE
if (password.length < 8) throw Error("too short")
setTimeout(retry, 86400000)

// AFTER
const MIN_PASSWORD_LENGTH = 8
const ONE_DAY_MS           = 24 * 60 * 60 * 1_000

if (password.length < MIN_PASSWORD_LENGTH) throw new WeakPasswordError()
setTimeout(retry, ONE_DAY_MS)
```

### Replace Nested Conditional With Guard Clauses

**When:** Main logic is buried under 3+ levels of if nesting
**How:** Invert conditions; return/throw early on failure cases

```
// BEFORE
function getPayAmount(employee) {
    let result
    if (employee.isSeparated) {
        result = separatedAmount(employee)
    } else {
        if (employee.isRetired) {
            result = retiredAmount(employee)
        } else {
            result = normalPayAmount(employee)
        }
    }
    return result
}

// AFTER
function getPayAmount(employee) {
    if (employee.isSeparated) return separatedAmount(employee)
    if (employee.isRetired)   return retiredAmount(employee)
    return normalPayAmount(employee)
}
```

### Replace Conditional With Polymorphism

**When:** Switch/if-else on a type discriminant; will grow with each new type
**How:** Create a class per type; each implements the varying behavior

See RULE-05 (OCP) for full example.

### Extract Class

**When:** A class is doing too much; identify a natural split by cohesion
**How:** Move the relevant fields and methods to a new class; reference it

### Move Method / Move Field

**When:** A method/field is used more by another class than its own class
**How:** Move it to where it's used; update all references

### Replace Primitive With Object (Value Object)

**When:** A raw type (string, number) carries domain meaning
**How:** Create a value object that validates and encapsulates it

```
// BEFORE
function createOrder(customerId: string, ...) {
    if (!customerId.startsWith('cust-')) throw Error("invalid customer ID")
}

// AFTER
class CustomerId {
    private constructor(readonly value: string) {}
    static parse(raw: string): CustomerId {
        if (!raw.startsWith('cust-')) throw new InvalidCustomerIdError(raw)
        return new CustomerId(raw)
    }
}
function createOrder(customerId: CustomerId, ...) { ... }  // guaranteed valid
```

### Introduce Parameter Object

**When:** Same group of parameters appears together repeatedly
**How:** Bundle them into a named data class / struct

---

## Rule 14.2 — The Boy Scout Rule

> **Always leave the code you touch cleaner than you found it.**

When the AI modifies any file for any reason:

- Fix any naming violations it encounters
- Apply guard clauses if it sees deep nesting
- Extract any magic numbers it spots
- Remove any dead code or commented-out code it finds

These micro-improvements compound over time and must not be skipped.

```
// You were asked to add a "cancelled" status.
// You found this in the file:

function getDiscount(status) {
    if (status == "ok") return 0.1   // magic string
    if (status == "vip") return 0.2  // magic string
    return 0
}

// Don't just add 'cancelled'. Leave it cleaner:
const STATUS_DISCOUNTS = { ok: 0.1, vip: 0.2, cancelled: 0 }
function getDiscount(status) {
    return STATUS_DISCOUNTS[status] ?? 0
}
```

---

## Rule 14.3 — Refactoring Commit Messages

Every refactoring must be committed separately from feature work, with a clear message:

```
// Commit message format: "refactor: <what changed>"

refactor: extract calculateOutstanding() from printOwing()
refactor: replace magic number 86400000 with ONE_DAY_MS constant
refactor: move overdraftCharge() to Account class (feature envy fix)
refactor: replace nested conditional with guard clauses in processPayment()
refactor: introduce Address value object for city/state/zip clump
refactor: split UserManager into UserAuthenticator and UserProfileService
```

---

## Rule 14.4 — When NOT to Refactor

The AI must NOT initiate refactoring when:

- Tests are **failing** — fix the tests first
- The code is **about to be deleted** — don't polish what you're removing
- The change is **purely speculative** — see YAGNI
- The deadline is **genuinely critical** — document the debt instead; pay it immediately after

---

## AI Self-Check for Refactoring

```
□ Are tests passing before any refactoring step begins?
□ Is each refactoring atomic — one named change, then verify?
□ Is the refactoring separate from any feature change?
□ Are Boy Scout improvements applied to any code touched?
□ Is the commit message descriptive: "refactor: ..."?
□ Is the resulting code demonstrably simpler / clearer than before?
□ Are all references updated (using IDE rename, not find-and-replace)?
```
