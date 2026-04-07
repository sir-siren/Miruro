---
name: universal-clean-code
trigger: "universal clean code, language agnostic, any language, polyglot, cross language principles"
---

# Universal Clean Code — Language-Agnostic Principles

These rules apply regardless of language: TypeScript, Rust, Go, Python, Zig, C, Java, anything.
They are the invariants of good code. Load this alongside the language-specific skill.

---

## The Universal Rules

### 1. Names Are The Primary Communication Channel

- Name = contract with the reader. Break the contract = break trust.
- If you need a comment to explain a name, the name is wrong.
- Use the domain's vocabulary. Code should read like business talk.

```
// Any language — same principle
BAD:  d, tmp, data, x, val, obj, result2
GOOD: daysSinceDeployment, pendingRetries, userEmailAddress, orderTotal
```

### 2. Functions / Methods Do ONE Thing

- One thing = one level of abstraction + can't meaningfully extract a named sub-operation from it
- If the function name has "and" in it — split it
- Max ~20 lines in most languages; less in functional styles

### 3. No Magic Values

```
// Universal smell
if status == 3        // What is 3?
if timeout > 30000    // 30 seconds? 30 milliseconds?
buf := make([]byte, 4096)  // Why 4096?

// Universal fix
MAX_RETRY_STATUS   = 3
REQUEST_TIMEOUT_MS = 30_000
BUFFER_SIZE        = 4096
```

### 4. Fail Fast, Fail Loudly

- Validate at the boundary (entry point of a function/module)
- Don't silently ignore errors — ever
- Crash with a clear message rather than limp with corrupted state

### 5. No Dead Code

- Commented-out code → delete (git exists)
- Unreachable branches → delete
- Unused imports/variables → delete (most linters enforce this)

### 6. Avoid Deep Nesting (Max 3 Levels)

```
// Universal fix: early return / guard clause

// BAD (any language)
if condition_a:
    if condition_b:
        if condition_c:
            do_work()

// GOOD
if not condition_a: return
if not condition_b: return
if not condition_c: return
do_work()
```

### 7. Each File/Module Has a Single Clear Purpose

- The filename should tell you what's inside
- If you can't describe the module in one sentence: split it

### 8. Explicit Over Implicit

- Explicit types > duck typing when it matters for safety
- Explicit error returns > exceptions hidden in call stacks (Go, Rust)
- Explicit lifetimes > GC magic when performance matters (Rust)

### 9. Immutability by Default

```
// Universal: start with immutable, opt into mutation only when necessary
// Rust:   let x = 5;          (immutable by default — must use `mut`)
// Go:     const x = 5
// Python: tuple instead of list where appropriate
// TS:     const, readonly, as const
```

### 10. Separate What Changes From What Stays the Same

The single most powerful design move in any paradigm:

- Logic that changes often ↔ isolated from logic that never changes
- Configuration ↔ separated from behavior
- I/O ↔ separated from pure computation

---

## Universal Anti-Patterns (Any Language)

| Anti-Pattern           | Example                                          | Fix                               |
| ---------------------- | ------------------------------------------------ | --------------------------------- |
| God function           | 200-line `main()`                                | Extract named sub-functions       |
| Magic values           | `if x > 86400`                                   | Named constants                   |
| Swallowed errors       | `catch {}` / `_ = err` / `pass`                  | Handle or propagate               |
| Premature optimization | Bit hacks before profiling                       | Profile first                     |
| Copy-paste             | 3 near-identical functions                       | Extract the common logic          |
| Inconsistent naming    | `getUserData` + `fetch_profile` + `loadUserInfo` | Pick one convention per project   |
| Boolean trap           | `render(true, false, true)`                      | Named parameters / options struct |

```
// Boolean trap — universal smell
// Any language:
processOrder(order, true, false, true)   // what do these mean??

// Fix: named options
processOrder(order, {
    chargeImmediately: true,
    sendConfirmation:  false,
    notifyWarehouse:   true,
})
```

---

## Universal Test Rules

Regardless of language/framework:

- **Arrange → Act → Assert** structure, blank lines between
- Test name describes behavior: `should_reject_negative_amounts`
- One concept per test
- Tests must be deterministic — no `sleep()`, no random seeds without fix
- No real I/O in unit tests — mock/stub/fake it
- Tests are documentation — they show how to use the code

---

## Universal Code Review Checklist

```
□ Does every function/method do one thing?
□ Are all names intention-revealing?
□ Is error handling present and not swallowed?
□ No magic numbers/strings?
□ No dead or commented-out code?
□ Max 3 levels of nesting?
□ No obvious duplication?
□ Tests cover the happy path AND failure paths?
□ No secrets/credentials in code?
□ Can I understand this in under 30 seconds?
```

---

## Language-Specific Companion Skills

| Language                 | Load This                                |
| ------------------------ | ---------------------------------------- |
| TypeScript               | `32-typescript-universal.md`             |
| React                    | `33-react-clean-code.md`                 |
| Rust                     | `34-rust-clean-code.md`                  |
| Go                       | `35-go-clean-code.md`                    |
| Python                   | `36-python-clean-code.md`                |
| Zig                      | `37-zig-clean-code.md`                   |
| Polyglot / Mixed project | All relevant + `38-polyglot-patterns.md` |
