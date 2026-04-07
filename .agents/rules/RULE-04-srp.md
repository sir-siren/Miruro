---
name: RULE-04-SRP
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-04 — Single Responsibility Principle (SRP)

> **AI DIRECTIVE: Every module, class, function, and file you generate must have exactly ONE
> reason to change — answerable to ONE actor (one group of stakeholders).
> If two different teams could independently force you to change the same unit, split it.**

---

## The Test

Before generating or approving any unit of code, ask:
**"Who would ask me to change this, and for what reason?"**

If the answer involves more than one stakeholder group → SRP violation → split.

```
// WRONG — three actors can force changes to this one class:
// 1. Finance team (billing rules)
// 2. DevOps (PDF generation, email format)
// 3. DBA (persistence schema)
class OrderManager {
    calculateTotal(order) { ... }      // Finance
    generateInvoicePDF(order) { ... }  // DevOps / Ops
    saveToDatabase(order) { ... }      // DBA
    sendConfirmationEmail(order) { ... }  // Marketing
}

// CORRECT — one actor per class
class OrderCalculator   { calculateTotal(order) { ... } }
class InvoiceFormatter  { generatePDF(order) { ... } }
class OrderRepository   { save(order) { ... } }
class OrderNotifier     { sendConfirmation(order) { ... } }
```

---

## Rule 4.1 — The "And" Rule

If you can describe what a unit does using **"and"**, it violates SRP.
Eliminate the "and" by extracting a new unit.

```
VIOLATION SIGNALS:
"This function fetches the user AND formats the response"
"This class validates input AND writes to the database"
"This module handles auth AND sends emails AND logs activity"

FIX: Each "AND" becomes a separate function/class/module.
```

---

## Rule 4.2 — File/Module Size as a Smell Signal

The AI must flag and split any file/module that:

- Exceeds **300 lines** (soft trigger) or **500 lines** (hard trigger)
- Imports from more than **5 unrelated domains** (auth + DB + email + PDF + analytics = red flag)
- Has methods/functions that **don't share any data with each other**

```
// WRONG — utils.ts with 30 unrelated functions
export function formatDate() { ... }
export function hashPassword() { ... }
export function sendEmail() { ... }
export function parseCSV() { ... }
export function generatePDF() { ... }
// These share NOTHING — they belong in separate focused modules

// CORRECT — each module is focused
// date-formatter.ts, password-hasher.ts, email-sender.ts, csv-parser.ts, pdf-generator.ts
```

---

## Rule 4.3 — Cohesion Metric

The AI must check: **"Do all methods/functions in this unit use most of the same data/fields?"**

High cohesion = they all work on the same data → GOOD (SRP likely satisfied)
Low cohesion = unrelated groups of methods each touch different fields → split by cohesion groups

```
// LOW COHESION — symptom of SRP violation
class AppController {
    // Group A — works with: this.userStore, this.sessionCache
    loginUser() { ... }
    logoutUser() { ... }

    // Group B — works with: this.db, this.pdfRenderer
    generateInvoice() { ... }
    archiveOrder() { ... }

    // Group C — works with: this.mailer, this.templateEngine
    sendWelcomeEmail() { ... }
    sendPasswordReset() { ... }
}
// Three distinct cohesion groups → three separate classes

// HIGH COHESION — all methods use the same data
class UserSessionService {
    constructor(userStore, sessionCache) { ... }
    login()  { uses this.userStore and this.sessionCache }
    logout() { uses this.userStore and this.sessionCache }
    refresh(){ uses this.sessionCache }
}
```

---

## Rule 4.4 — The Extraction Strategy

When SRP is violated, apply one of these:

**Strategy A: Extract Class/Module**
Pull one cohesion group into its own named class.

**Strategy B: Extract Function**
Pull a sub-operation into a named function with single purpose.

**Strategy C: Façade (for backward compatibility)**
When external code depends on the monolith, keep a thin façade that delegates:

```
// Keep old interface, delegate to focused new classes
class LegacyOrderManager {
    constructor() {
        this._calc   = new OrderCalculator()
        this._repo   = new OrderRepository()
        this._notify = new OrderNotifier()
    }
    calculateTotal(order) { return this._calc.calculateTotal(order) }
    save(order)            { return this._repo.save(order) }
    notify(order)          { return this._notify.sendConfirmation(order) }
}
```

---

## Rule 4.5 — SRP at Every Scale

SRP applies at every granularity level. The AI must enforce it at all of them:

| Level                 | SRP Means                                    |
| --------------------- | -------------------------------------------- |
| **Function**          | Does one operation at one abstraction level  |
| **Class/Struct**      | Has one domain concept's state and behavior  |
| **File/Module**       | Contains one cohesive group of related units |
| **Package/Crate/Lib** | Serves one bounded domain concern            |
| **Service/Process**   | Owned by one team, one deployment concern    |

---

## Rule 4.6 — Common SRP Violations the AI Must Flag

| Pattern                             | Violation                  | Fix                             |
| ----------------------------------- | -------------------------- | ------------------------------- |
| God class                           | Does everything            | Extract Class by cohesion       |
| Controller with business logic      | HTTP + domain mixed        | Extract Service layer           |
| Repository with formatting          | Persistence + presentation | Extract Presenter/Formatter     |
| Validator that saves data           | Validation + side effect   | Separate validate() from save() |
| `utils.ts` / `helpers.py` catch-all | No coherent purpose        | Split into focused modules      |
| `main()` over 50 lines              | Bootstrap + business logic | Extract setup functions         |

---

## AI Self-Check for SRP

```
□ Can this unit's purpose be described in one sentence without "and"?
□ Who are the distinct actors (stakeholders) who could force a change here?
□ If there's more than one actor → extract separate units?
□ Do all methods/functions use most of the same state/data (high cohesion)?
□ Are there distinct cohesion groups that should be separate classes?
□ Is this file under 300 lines?
□ Does this module import from fewer than 5 unrelated domains?
```
