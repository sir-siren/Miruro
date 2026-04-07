---
name: RULE-10-SIMPLICITY
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-10 — Simplicity: DRY + KISS + YAGNI

> **AI DIRECTIVE: Complexity must justify its cost. Every abstraction, every indirection,
> every "future-proofing" layer is a liability until proven an asset.
> Write the simplest code that correctly solves the actual present problem.**

---

## The Three Simplicity Principles

| Principle                           | Core Rule                                               | Violation Signal                           |
| ----------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| **DRY** — Don't Repeat Yourself     | Every piece of knowledge has ONE authoritative location | Same logic in 2+ places                    |
| **KISS** — Keep It Simple, Stupid   | The simplest working solution is the best solution      | Over-engineering for imagined future needs |
| **YAGNI** — You Ain't Gonna Need It | Build features only when actually required              | "What if we need..." abstractions          |

---

## DRY — Rules

### Rule 10.1 — DRY Is About Knowledge, Not Just Code

```
// These look similar but represent DIFFERENT knowledge → do NOT force DRY
function validateUserEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
function validateContactEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
// If user and contact email validation will diverge in future, keeping
// them separate is CORRECT. Premature DRY creates accidental coupling.

// These ARE the same knowledge → MUST be DRY
// Both calculate "is eligible for loyalty discount?"
// If you change the threshold in one place, you MUST change it in all → single source
const LOYALTY_DISCOUNT_THRESHOLD = 500_00  // cents
function isEligibleForLoyaltyDiscount(totalSpent) {
    return totalSpent >= LOYALTY_DISCOUNT_THRESHOLD
}
```

### Rule 10.2 — The Rule of Three

```
FIRST occurrence:  write it inline
SECOND occurrence: note the duplication, consider abstracting
THIRD occurrence:  MUST abstract — the pattern is clear

// Don't abstract on the first or second occurrence.
// Premature abstraction → wrong interface → harder to remove than duplication.
```

### Rule 10.3 — Types of Duplication the AI Must Eliminate

| Type                          | Example                                        | Fix                                 |
| ----------------------------- | ---------------------------------------------- | ----------------------------------- |
| **Logic duplication**         | Discount check in 3 services                   | Extract `isEligibleForDiscount()`   |
| **Configuration duplication** | Same timeout value in 6 files                  | Named constant, imported everywhere |
| **Type/schema duplication**   | Same `User` shape defined in 4 files           | Single canonical type, re-exported  |
| **Validation duplication**    | Email validation copied to UI + API + DB layer | Single `validateEmail()` function   |

```
// WRONG — same magic value in 6 files
// service-a.ts:  if (retries > 3)
// service-b.ts:  for (let i = 0; i < 3; i++)
// config.ts:     maxRetries: 3

// CORRECT — single source of truth
// constants.ts
export const MAX_RETRY_ATTEMPTS = 3

// service-a.ts, service-b.ts, config.ts all import MAX_RETRY_ATTEMPTS
```

---

## KISS — Rules

### Rule 10.4 — The Simplest Correct Solution Wins

```
// WRONG — bitwise cleverness for no reason
const isEven = (n & 1) === 0     // clever but requires mental translation

// CORRECT — obvious, readable, correct
const isEven = n % 2 === 0

// WRONG — factory factory for a single config value
class ConfigurationManagerFactory {
    createConfigurationManager(strategy) { ... }
}
class ConfigurationManager {
    constructor(loader, parser, validator) { ... }
    load() { ... }
}

// CORRECT — solve the actual problem
function loadConfig(filePath) {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    assertRequiredFields(parsed, ['apiUrl', 'port'])
    return parsed
}
```

### Rule 10.5 — Complexity Must Be Justified

Before generating any abstraction, ask: **"What real problem does this solve right now?"**

```
Questions to ask before adding abstraction:
  □ Does more than one concrete case exist right now?
  □ Is this problem actually complex enough to need this pattern?
  □ Could a junior developer understand this in 5 minutes?
  □ Would this be simpler with just a function + a map?
  □ Am I abstracting for actual reuse, or imagined reuse?
```

### Rule 10.6 — Prefer Boring, Well-Understood Solutions

```
// WRONG — bleeding-edge just because
// Using a custom event bus + CQRS + event sourcing for a to-do list app

// CORRECT — match complexity to the problem
// A to-do list app needs: array + save/load. That's it.

// The rule: boring tech is battle-tested tech.
// Innovation budget should be spent on the problem, not the infrastructure.
```

---

## YAGNI — Rules

### Rule 10.7 — Never Build Features Not Currently Required

```
// WRONG — plugin system for a single notification channel
interface NotificationPlugin {
    name: string
    version: string
    initialize(config: PluginConfig): Promise<void>
    send(message: Message): Promise<Result>
    teardown(): Promise<void>
}
class NotificationPluginManager { ... }
// There is ONE channel. This will never be a plugin system.
// 200 lines of infrastructure for a future that likely won't come.

// CORRECT — just send the email
async function sendEmailNotification(to, message) {
    await mailer.send({ to, subject: 'Notification', text: message })
}
// When a second channel is needed → THEN extract an abstraction.
```

### Rule 10.8 — YAGNI Does Not Mean "No Architecture"

YAGNI prohibits building **features and capabilities** not yet needed.
It does NOT prohibit:

- Clean interfaces (enables future extension cheaply)
- Writing tests (enables safe future change)
- Following SOLID (makes future extension cheap)
- Naming things clearly (reduces future confusion)

```
// The deal:
// Write YAGNI code (minimum viable) NOW
// Write tests (so you can safely extend LATER)
// Keep it clean (so extension is cheap LATER)
// Add the feature when you actually need it → THEN
```

### Rule 10.9 — Delete Speculative Code Immediately

```
// BANNED patterns — speculative generality:
// "We might need this someday"
// "Let's add a hook point for future extensibility"
// "I'll leave this in case we want to add plugins later"

// These are boat anchors. Delete them.
// Git history preserves everything. You can always bring it back.
```

---

## Simplicity Combined Checklist

```
DRY:
  □ Is any logic / validation / configuration duplicated across 3+ locations?
  □ Is any type/schema defined in more than one place?
  □ Does changing one business rule require editing multiple files?

KISS:
  □ Is there a simpler way to solve this that would still be correct?
  □ Would a junior developer understand this in 5 minutes?
  □ Is every abstraction layer solving a real, present problem?
  □ Is "boring" tech sufficient for this problem?

YAGNI:
  □ Does every piece of code serve a requirement that exists RIGHT NOW?
  □ Are there any "just in case" extension points / hooks / plugin systems?
  □ Are there any unused parameters, fields, or generics?
  □ Is there any dead code or commented-out code?
```
