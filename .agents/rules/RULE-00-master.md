---
name: GLOBAL-RULES-MASTER
type: ai-behavioral-directive
applies-to: ALL languages — JavaScript, TypeScript, React, Rust, Go, Python, Zig, C, C++, Java, any other
priority: HIGHEST — these rules override stylistic preferences
---

# Global AI Code Rules — Master Directive

## What These Rules Are

These are **non-negotiable behavioral constraints** for every line of code generated, reviewed,
or refactored. They are not suggestions. They are not style preferences. They are the minimum
standard for code that is safe to ship, safe to read, and safe to change.

They apply in **every language**. When a language-specific idiom conflicts with these rules,
the rules win unless the idiom IS the idiomatic way to express the same principle in that language
(e.g., Rust's `?` operator IS the idiomatic expression of "never silently ignore errors").

---

## Rule Files — What Each Covers

| File                        | Rule Domain            | One Line                       |
| --------------------------- | ---------------------- | ------------------------------ |
| `RULE-01-naming.md`         | Naming                 | Every name reveals intent      |
| `RULE-02-functions.md`      | Functions/Procedures   | One function, one job          |
| `RULE-03-error-handling.md` | Errors                 | Never silently fail            |
| `RULE-04-srp.md`            | SOLID: SRP             | One reason to change           |
| `RULE-05-ocp.md`            | SOLID: OCP             | Extend, never patch            |
| `RULE-06-lsp.md`            | SOLID: LSP             | Subtypes must not surprise     |
| `RULE-07-isp.md`            | SOLID: ISP             | No unused dependencies         |
| `RULE-08-dip.md`            | SOLID: DIP             | Depend on shape, not substance |
| `RULE-09-state.md`          | State & Immutability   | Default to immutable           |
| `RULE-10-testing.md`        | Testing                | Tests are first-class code     |
| `RULE-11-structure.md`      | Structure & Formatting | Code reads top-to-bottom       |
| `RULE-12-comments.md`       | Comments               | Explain why, never what        |
| `RULE-13-simplicity.md`     | KISS / YAGNI / DRY     | Complexity must earn its place |
| `RULE-14-complexity.md`     | Cognitive Complexity   | Flatten, guard, return early   |
| `RULE-15-review.md`         | Review & Refactor      | Leave it better than found     |

---

## Non-Negotiable Hard Rules (Summary)

These apply before reading any other rule file:

```
NEVER generate code that:
  - Silently ignores errors (no empty catch, no _ = err, no unwrap in prod)
  - Uses names shorter than 3 chars outside loop indices (i, j, k)
  - Has a function longer than ~25 lines without strong justification
  - Mixes I/O with business logic in the same function
  - Duplicates logic that already exists or could be extracted
  - Uses magic numbers / magic strings (use named constants)
  - Has nesting deeper than 3 levels (use guard clauses / early returns)
  - Has commented-out code
  - Passes more than 3-4 raw positional arguments (use a config/options struct)
  - Returns null/nil where a typed error or Option type is cleaner
  - Hardcodes credentials, secrets, or environment-specific values

ALWAYS generate code that:
  - Names reveal intent at first read
  - Each module/class/file has a single clear purpose
  - Dependencies flow inward (high-level does not import low-level concretions)
  - Tests exist for every non-trivial piece of logic
  - Errors carry context (what failed, where, why)
  - Immutable data is the default; mutation is the explicit exception
  - Public API is minimal and intentional
```

---

## How to Use These Rules

**When generating new code:**
Load `RULE-01` through `RULE-15`. Generate code that satisfies all of them.

**When reviewing existing code:**
Load the relevant rule files. Flag every violation. Suggest the fix.

**When refactoring:**
Load `RULE-15-review.md` first. Then the rule file for the specific smell.

**Language mapping:**
These rules use pseudocode in examples. Map them to the target language:

| Concept           | JS/TS                                 | Rust                       | Go                | Python                | Zig                    |
| ----------------- | ------------------------------------- | -------------------------- | ----------------- | --------------------- | ---------------------- |
| Interface/Trait   | `interface` / `type`                  | `trait`                    | `interface`       | `Protocol` / `ABC`    | `comptime` duck typing |
| Error type        | `Error` subclass / `Result<T,E>` type | `enum Error` + `thiserror` | `error` interface | Exception subclass    | `error` set            |
| Immutable binding | `const`                               | `let` (default)            | `const`           | variable (conceptual) | `const`                |
| Optional value    | `T \| null`, `Option<T>` type         | `Option<T>`                | pointer nil check | `T \| None`           | `?T` optional          |
| Module            | `module` / file                       | `mod`                      | `package`         | `module` / file       | file                   |
