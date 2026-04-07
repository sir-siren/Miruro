---
name: RULE-INDEX
type: ai-behavioral-directive
applies-to: ALL — load this first when routing to the right rule
---

# Global AI Rules — Master Index

This is the routing file. Use the symptom, task, or keyword to find the exact rule to apply.

---

## All 25 Rules at a Glance

| File                                | Rule             | One-Line Directive                              |
| ----------------------------------- | ---------------- | ----------------------------------------------- |
| `RULE-00-master.md`                 | Master Directive | Hard rules summary + language mapping           |
| `RULE-01-naming.md`                 | Naming           | Every name reveals intent immediately           |
| `RULE-02-functions.md`              | Functions        | One function, one job, ≤20 lines                |
| `RULE-03-error-handling.md`         | Errors           | Never swallow; always type; always context      |
| `RULE-04-srp.md`                    | SRP              | One reason to change per module                 |
| `RULE-05-solid-oclid.md`            | OCP+LSP+ISP+DIP  | Extend not patch; substitutable; narrow; invert |
| `RULE-06-state-immutability.md`     | State            | Immutable by default; encapsulate mutation      |
| `RULE-07-testing.md`                | Testing          | FIRST, AAA, one concept, right doubles          |
| `RULE-08-structure.md`              | Structure        | Newspaper layout, blank lines, top-down         |
| `RULE-09-comments.md`               | Comments         | WHY only; no redundant, dead, or lie comments   |
| `RULE-10-simplicity.md`             | DRY+KISS+YAGNI   | Solve the actual problem, once                  |
| `RULE-11-complexity.md`             | Complexity       | Flatten, guard, return early, ≤3 levels         |
| `RULE-12-separation-of-concerns.md` | SoC              | I/O at edges; domain in center; no mixing       |
| `RULE-13-code-smells.md`            | Code Smells      | Detect + name + fix bloaters/couplers/etc.      |
| `RULE-14-refactoring.md`            | Refactoring      | Atomic, safe, boy-scout, separate from features |
| `RULE-15-code-review.md`            | Code Review      | 🔴🟡🟢 severity; full checklist; quality gates  |
| `RULE-16-security.md`               | Security         | No injection; no secrets; no weak crypto        |
| `RULE-17-concurrency.md`            | Concurrency      | Await all; bound tasks; protect shared state    |
| `RULE-18-api-design.md`             | API Design       | Minimal; predictable; hard to misuse; versioned |
| `RULE-19-data-modeling.md`          | Data Modeling    | Make illegal states unrepresentable             |
| `RULE-20-logging.md`                | Logging          | Structured; contextual; never sensitive data    |
| `RULE-21-dependencies.md`           | Dependencies     | No cycles; minimal; explicit boundaries; pin    |
| `RULE-22-performance.md`            | Performance      | Right algorithm first; measure before optimize  |
| `RULE-23-configuration.md`          | Configuration    | Env vars; validate at startup; fail fast        |
| `RULE-24-domain-language.md`        | Domain           | Code speaks business language; explicit events  |

---

## Route by Symptom

| What You're Seeing                                 | Load Rule                  |
| -------------------------------------------------- | -------------------------- |
| Cryptic variable names (`d`, `x`, `tmp`)           | `RULE-01`                  |
| 80-line function doing 5 things                    | `RULE-02`, `RULE-04`       |
| Silently ignored errors (`catch {}`, `_ = err`)    | `RULE-03`                  |
| God class with 500+ lines                          | `RULE-04`, `RULE-13`       |
| Type-switch that grows with every new type         | `RULE-05` (OCP)            |
| Subclass throws NotImplemented                     | `RULE-05` (LSP)            |
| Fat interface forced on all implementors           | `RULE-05` (ISP)            |
| Business logic imports from database layer         | `RULE-05` (DIP), `RULE-12` |
| Shared mutable state causing intermittent bugs     | `RULE-06`, `RULE-17`       |
| Flaky tests / tests that call real DB              | `RULE-07`                  |
| File hard to scan — no visual structure            | `RULE-08`                  |
| Comments that explain WHAT code does               | `RULE-09`                  |
| Same validation logic in 4 places                  | `RULE-10` (DRY)            |
| Over-engineered for a simple problem               | `RULE-10` (KISS/YAGNI)     |
| Deeply nested if-else (4+ levels)                  | `RULE-11`                  |
| Business logic in HTTP handler                     | `RULE-12`                  |
| Can't name the smell but something is wrong        | `RULE-13`                  |
| Need to restructure code safely                    | `RULE-14`                  |
| Reviewing a pull request                           | `RULE-15`                  |
| SQL string interpolation / hardcoded secrets       | `RULE-16`                  |
| Fire-and-forget Promises / leaked goroutines       | `RULE-17`                  |
| Inconsistent HTTP status codes / response shapes   | `RULE-18`                  |
| Optional fields that create ambiguous combinations | `RULE-19`                  |
| console.log("user:", user) with passwords          | `RULE-20`                  |
| Circular dependency between modules                | `RULE-21`                  |
| N+1 query pattern                                  | `RULE-22`                  |
| Hardcoded config values / missing .env.example     | `RULE-23`                  |
| Technical vocabulary disconnected from business    | `RULE-24`                  |

---

## Route by Task

### Writing New Code

Load in this order: `RULE-00` → `RULE-01` → `RULE-02` → `RULE-19` → `RULE-24` → `RULE-07`

### Designing a New Module / Service

`RULE-04` → `RULE-05` → `RULE-12` → `RULE-18` → `RULE-19` → `RULE-21` → `RULE-24`

### Reviewing Code (PR Review)

`RULE-15` → `RULE-13` → `RULE-16` → `RULE-03` → `RULE-07`

### Debugging a Bug

`RULE-03` → `RULE-13` → `RULE-06` → `RULE-17`

### Refactoring Legacy Code

`RULE-13` → `RULE-14` → `RULE-04` → `RULE-10` → `RULE-11`

### Security Audit

`RULE-16` → `RULE-03` → `RULE-20` → `RULE-23` → `RULE-18`

### Performance Investigation

`RULE-22` → `RULE-17` → `RULE-21` → `RULE-12`

### Writing Tests

`RULE-07` → `RULE-05` (DIP for testability) → `RULE-06` (pure functions)

---

## The 10 Rules That Matter Most

If you can only internalize 10 rules, make it these:

```
1.  RULE-03  Error handling — never silently fail
2.  RULE-01  Naming — names reveal intent
3.  RULE-04  SRP — one reason to change
4.  RULE-05  DIP — depend on abstractions
5.  RULE-07  Testing — FIRST, AAA, one concept
6.  RULE-11  Complexity — flatten and guard
7.  RULE-12  SoC — I/O at edges, domain in center
8.  RULE-16  Security — never inject user input
9.  RULE-10  DRY/KISS/YAGNI — simplicity wins
10. RULE-06  Immutability — default to immutable
```

---

## Non-Negotiable Absolute Rules (Any Language, Any Context)

```
NEVER:
  □ Silently ignore errors (catch {}, _ = err, pass in except)
  □ Hardcode secrets in source code
  □ Interpolate user input into SQL, shell, or HTML
  □ Use Math.random() / rand.Intn() for security tokens
  □ Commit commented-out code
  □ Return null where a typed error or Option is cleaner
  □ Write a function longer than 25 lines without strong justification
  □ Use names shorter than 3 chars (outside i/j/k loop indices)
  □ Nest code deeper than 3 levels
  □ Introduce circular dependencies

ALWAYS:
  □ Names reveal intent at first read
  □ Every function does ONE thing
  □ Errors are typed and carry context
  □ Tests exist for every non-trivial logic path
  □ Dependencies point inward (domain knows nothing about infrastructure)
  □ Immutable by default; mutation is the explicit exception
  □ Configuration comes from the environment; validated at startup
```
