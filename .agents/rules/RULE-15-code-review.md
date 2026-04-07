---
name: RULE-15-CODE-REVIEW
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-15 — Code Review & Quality Gates

> **AI DIRECTIVE: When reviewing code — yours or another's — apply a structured, severity-rated
> assessment. Every issue must be named, explained, and fixed. Rubber-stamping is not a review.
> The goal is better software, not social comfort.**

---

## Review Mindset

```
ALWAYS:
  - Distinguish severity clearly: Blocker / Warning / Nit
  - Ask questions instead of making accusations
  - Explain WHY something is wrong, not just that it is
  - Praise good patterns — reinforce what should continue
  - Focus on the code, never the person

NEVER:
  - Approve code with unresolved Blockers
  - Flag style issues that a linter/formatter should catch automatically
  - Comment on personal preference without a principle behind it
  - Leave reviews that say only "LGTM" on non-trivial changes
```

---

## Severity Levels

| Level       | Symbol | Meaning                                             | Can Merge?                |
| ----------- | ------ | --------------------------------------------------- | ------------------------- |
| **Blocker** | 🔴     | Correctness, security, data loss, crash risk        | NO                        |
| **Warning** | 🟡     | Design, maintainability, performance, test coverage | Only with owner agreement |
| **Nit**     | 🟢     | Minor clarity, style, preference                    | YES (author's discretion) |
| **Praise**  | ✅     | Good pattern worth reinforcing                      | N/A                       |

---

## The Full Review Checklist

The AI must systematically check every category:

### 🔴 Correctness (Blockers)

```
□ Does the code do what the description / requirements say?
□ Are edge cases handled?
  - Empty/null inputs
  - Zero, negative, max-value numbers
  - Empty collections
  - Concurrent access (if applicable)
□ Are errors handled — none silently ignored?
□ Is there any potential data loss or corruption?
□ Are any security vulnerabilities present?
  - User input used in SQL/shell/HTML without sanitization
  - Secrets hardcoded or logged
  - Authentication bypass
  - Authorization not checked (only authentication)
  - Insecure direct object references
□ Are tests present and do they actually test the right behavior?
```

### 🟡 Design (Warnings)

```
□ Does every function/class have a single clear responsibility? (RULE-04)
□ Are there any OCP violations (type switches that will grow)? (RULE-05)
□ Are dependencies flowing inward only? (RULE-05 DIP, RULE-12)
□ Is business logic separated from I/O? (RULE-12)
□ Is there any duplication (3+ occurrences)? (RULE-10)
□ Are error types specific and contextual? (RULE-03)
□ Is mutable state minimal and encapsulated? (RULE-06)
□ Are interfaces narrow (ISP)? (RULE-05)
□ Are there any code smells? (RULE-13)
```

### 🟡 Performance (Warnings)

```
□ Are there N+1 query patterns?
□ Are large datasets loaded into memory that could be streamed?
□ Is there any O(n²) or worse algorithm where O(n) is available?
□ Are caches invalidated on writes?
□ Are any tight loops doing unnecessary allocations?
```

### 🟡 Test Quality (Warnings)

```
□ Do tests follow AAA structure?
□ Do test names describe behavior?
□ Is each test testing one concept?
□ Are error paths tested — not just happy path?
□ Are real I/O dependencies (DB/network) mocked/faked?
□ Would a test failure tell you exactly what broke?
```

### 🟢 Readability (Nits)

```
□ Are names intention-revealing?
□ Are magic numbers replaced with constants?
□ Are comments explaining WHY (not WHAT)?
□ Is nesting depth ≤ 3?
□ Are guard clauses used instead of nested ifs?
□ Are lines under 100 chars?
```

---

## Feedback Templates

```
🔴 BLOCKER — Security:
"This directly interpolates user input into the SQL query.
This is a SQL injection vulnerability. Please use parameterized queries:
  db.query('SELECT * FROM users WHERE email = $1', [email])"

🔴 BLOCKER — Error handling:
"The error from `risky_operation()` is silently discarded here (`_ = result`).
If this fails, the caller has no idea and data corruption can follow.
Please propagate or handle it explicitly."

🟡 WARNING — Design:
"This function is doing three distinct things: parsing the input, validating it,
and persisting it. Per SRP, these should be separate functions.
Would extracting `parseInput()`, `validateInput()`, and `persist()` make sense here?"

🟡 WARNING — Test coverage:
"I see the happy path is tested, but there's no test for when the payment is declined.
That error path has real business consequences — could we add a test for it?"

🟢 NIT:
"Nit: `d` isn't very descriptive here. `daysSinceLastLogin` would make the intent
clearer at a glance. Totally your call though."

✅ PRAISE:
"Nice use of guard clauses here — the main logic reads very cleanly as a result. ✓"
```

---

## Rule 15.1 — Quality Gates: Non-Negotiable Before Merge

The following must ALL be true before the AI approves or ships any code:

```
□ All existing tests pass
□ New tests written for new logic
□ No secrets / credentials in code
□ No TODO/FIXME without a tracking reference
□ No commented-out code
□ No .unwrap()/.expect() in Rust (outside tests)
□ No _ = err in Go
□ No bare except/catch in Python/JS
□ No `any` type in TypeScript (without documented justification)
□ Formatter has been run (code is auto-formatted)
□ Linter passes with no errors
□ Imports are ordered and grouped
□ No dead code (unused functions, variables, imports)
```

---

## Rule 15.2 — Automate What Linters Can Catch

The AI must NOT manually flag things that tools handle automatically.
The following should be in CI/CD and never mentioned in review:

```
Automated (never flag manually):
  - Formatting (Prettier / gofmt / rustfmt / ruff)
  - Import ordering (ESLint / isort / rustfmt)
  - Unused imports (TSC / Rust compiler / ruff)
  - Obvious type errors (TypeScript compiler)
  - Simple naming convention violations (ESLint)

Manual review should cover only:
  - Correctness and logic
  - Architecture and design
  - Security
  - Business requirements alignment
  - Test quality and coverage
```

---

## Rule 15.3 — PR Size Guidance

The AI should flag excessively large PRs:

| Lines Changed | Status        | Action                                     |
| ------------- | ------------- | ------------------------------------------ |
| < 200         | ✅ Ideal      | Fast, focused review                       |
| 200–500       | 🟡 Acceptable | Review carefully, check for mixed concerns |
| 500–1000      | ⚠️ Large      | Request split if possible                  |
| > 1000        | 🔴 Too large  | Must be split before review                |

---

## AI Self-Check Before Finalizing Code

```
□ No Blockers unresolved?
□ All quality gate items satisfied?
□ Does this code leave the codebase cleaner than it was?
□ Would I be comfortable if a senior engineer reviewed this in 6 months?
□ Is there anything here I'd be embarrassed to explain?
  → If YES: fix it before shipping.
```
