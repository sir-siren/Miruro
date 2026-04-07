---
name: RULE-09-COMMENTS
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-09 — Comments & Documentation

> **AI DIRECTIVE: Comments are a code smell when they explain what the code does.
> Comments are valuable when they explain WHY the code does it.
> Every comment you generate must add information that the code itself cannot express.
> If the code can be rewritten to make the comment unnecessary — rewrite the code.**

---

## The Decision Rule

```
Before writing a comment, ask:
  "Can I rename, extract, or restructure the code to make this comment unnecessary?"
  YES → Do that. Delete the comment.
  NO  → Is this comment explaining WHY (not WHAT)?
        YES → Write it.
        NO  → Delete it.
```

---

## Absolute Prohibitions — Never Generate These

### Redundant Comments (explain what the code already says)

```
// BANNED — completely redundant

// Set the user name
user.name = newName

// Check if user is active
if (user.isActive) { ... }

// Increment counter
count++

// Returns the sum of a and b
function add(a, b) { return a + b }
```

### Commented-Out Code

```
// BANNED — always. Use version control instead.

// function oldGetUser(id) {
//   return db.query(`SELECT * FROM users WHERE id = ${id}`)
// }

// const legacyAdapter = new LegacyDBAdapter()
```

### Noise / Filler Comments

```
// BANNED

///////////////////////
// SECTION: HELPERS //
///////////////////////

// ====================================
// BEGIN USER FUNCTIONS
// ====================================

/* ---------------------------------------- */
```

### Journal / Changelog Comments

```
// BANNED — this is git's job

// 2024-01-15 John: Added validation
// 2024-02-03 Jane: Fixed null bug
// 2026-01-10 Siren: Refactored for speed
```

### Closing Brace Comments

```
// BANNED — symptom of over-nesting, not a solution to it

if (condition) {
    for (...) {
        // ...
    } // end for
} // end if
```

### Attributions

```
// BANNED — git blame exists for this

// Written by Siren — 2026-01-10
// TODO: fix this (John)
```

---

## Comments That MUST Be Generated

### WHY Comments (Intent Explanation)

When code is necessarily non-obvious, explain the reasoning:

```
// We sort descending here because the UI contract (issue #882) requires
// the most recently modified item to appear first. The API returns ascending.
return items.sort((a, b) => b.updatedAt - a.updatedAt)

// Using a reentrant lock because this function is called recursively
// during the graph traversal in resolveTransitiveDependencies().
const lock = new ReentrantMutex()

// Multiply by 100 to convert dollars → cents before storing.
// All monetary values in the database are stored as integer cents
// to avoid floating-point precision issues (see ADR-007).
const storedAmount = Math.round(dollarAmount * 100)
```

### Warning of Consequences

```
// WARNING: This timeout must be ≥ 450ms. The external payment API has a
// documented minimum response time of 400ms on their staging environment.
// Tests will be flaky if this is reduced. See issue #1203.
const PAYMENT_GATEWAY_TIMEOUT_MS = 500

// NOTE: This function modifies the input slice in place for performance.
// Clone before passing if the original order matters to the caller.
function sortInPlace(items) { items.sort() }
```

### TODO/FIXME With Tracking References

```
// TODO(#1234 — 2026-03-22): Replace with cursor-based pagination once
// the API v2 endpoint is released. Current limit is 500 items max.
const items = await fetchAllItems()

// FIXME(#892): Race condition when two workers update the same job
// concurrently. Needs distributed lock. Severity: medium.
async function updateJobStatus(jobId, status) { ... }
```

### Public API Documentation

Public functions, methods, modules that others consume MUST have docstrings:

```
// Pseudocode — use the target language's doc format (JSDoc, Rustdoc, godoc, docstring, etc.)

/**
 * Calculates compound interest over a given period.
 *
 * @param principal - Initial investment in the smallest currency unit (e.g., cents)
 * @param annualRate - Annual interest rate as a decimal (e.g., 0.05 for 5%)
 * @param years - Number of years to compound
 * @returns Total amount in the same unit as principal after compounding
 *
 * @example
 *   compoundInterest(100_000, 0.05, 10) → 162_889
 */
function compoundInterest(principal, annualRate, years) { ... }
```

### Legal / License Headers

```
// Copyright (c) 2026 Author Name. MIT License.
// See LICENSE in the repository root for details.
```

---

## The Refactoring-Comments-Away Rule

When the AI finds a comment that explains WHAT code does, it must rewrite the code to eliminate the comment:

```
// BEFORE — comment tries to explain cryptic code
// Check if user has been inactive for more than 30 days
if ((Date.now() - user.lastLoginAt.getTime()) > 2_592_000_000) { ... }

// AFTER — named constant + named predicate eliminates the comment entirely
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000

function isInactiveForThirtyDays(user) {
    return (Date.now() - user.lastLoginAt.getTime()) > THIRTY_DAYS_MS
}

if (isInactiveForThirtyDays(user)) { ... }
// No comment needed — the code is the documentation
```

---

## Language Doc-Comment Formats

The AI must use the **correct doc comment format** for the target language:

| Language | Format                                     | Tool          |
| -------- | ------------------------------------------ | ------------- |
| JS/TS    | `/** ... */` JSDoc                         | TypeDoc       |
| Rust     | `/// ...` or `//! ...` for modules         | rustdoc       |
| Go       | `// FunctionName ...` directly above       | godoc         |
| Python   | `"""..."""` docstring (Google/NumPy style) | Sphinx/mkdocs |
| Zig      | `/// ...` doc comments                     | autodoc       |

---

## AI Self-Check for Comments

```
□ Does every comment explain WHY — not WHAT or HOW?
□ Could the code be rewritten to make any comment unnecessary?
□ Is there any commented-out code? → Delete it.
□ Are there any redundant/noise comments? → Delete them.
□ Are there changelog/attribution comments? → Delete them (use git).
□ Do all TODO/FIXME comments have a ticket reference and date?
□ Are all public API surfaces documented in the correct doc format?
□ Are warning comments present where consequences are non-obvious?
```
