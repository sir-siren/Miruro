---
name: clean-code-overview
trigger: "clean code, what is clean code, readable code, maintainable code, Uncle Bob"
---

# Clean Code — Master Overview

> **"Clean code is code that has been taken care of. Someone has taken the time to keep it simple
> and orderly. They have paid appropriate attention to details."**
> — Robert C. Martin, _Clean Code_ (2008)

Clean code is not clever code. It is **readable, expressive, and intention-revealing** code that
any competent developer can understand and safely modify.

---

## The Clean Code Philosophy

### Why Code Quality Matters

- Code is read ~10x more often than it is written
- Messy code slows teams exponentially over time (the "code debt" compound interest)
- The only way to go fast long-term is to keep code clean short-term
- **The Boy Scout Rule**: leave the codebase cleaner than you found it

### The Primary Audience

Code is written for **humans first**, machines second. The compiler doesn't care about variable
names or function length — your teammates do.

---

## Clean Code Dimensions

| Dimension          | Question                                   | Skill File             |
| ------------------ | ------------------------------------------ | ---------------------- |
| **Naming**         | Do names reveal intent?                    | `08-naming.md`         |
| **Functions**      | Do functions do one thing?                 | `09-functions.md`      |
| **Comments**       | Are comments necessary and truthful?       | `10-comments.md`       |
| **Formatting**     | Does structure aid readability?            | `11-formatting.md`     |
| **Error Handling** | Is error handling expressive and isolated? | `12-error-handling.md` |
| **Classes**        | Are classes small and cohesive?            | `13-classes.md`        |
| **Testing**        | Are tests clean and comprehensive?         | `14-unit-testing.md`   |
| **Code Smells**    | What patterns signal rot?                  | `15-code-smells.md`    |

---

## Clean Code vs. Working Code

Many developers conflate "it works" with "it's done." Clean Code says the job isn't done until:

1. It passes all tests ✓
2. Contains no duplication ✓
3. Expresses all design ideas ✓
4. Minimizes the number of entities (classes, methods, functions) ✓

This is Kent Beck's **Four Rules of Simple Design** — the foundation Clean Code is built on.

---

## The Most Important Rules (Quick Ref)

### General

- Keep it simple. Reduce complexity relentlessly.
- Follow standard conventions. Consistency beats cleverness.
- Always find the root cause of a problem — never treat symptoms.

### Naming

- Names should reveal intent: `daysSinceCreation` not `d`
- No abbreviations, no magic numbers, no type encodings

### Functions

- Small (max 20 lines, ideally <10)
- Do ONE thing at ONE level of abstraction
- No more than 3 arguments (use an options object for more)
- No side effects; no flag arguments

### Comments

- Prefer self-documenting code over comments
- Comments that survive: intent explanation, warnings, public API docs
- Comments that must die: redundant, obsolete, commented-out code

### Error Handling

- Use exceptions, not return codes
- Don't return `null`; don't pass `null`
- Keep error handling separate from business logic

### Classes

- Small — one responsibility
- High cohesion (methods use most instance variables)
- Low coupling (depends on few external things)

---

## The Craftsmanship Mindset

> "It is not enough for code to work."

Clean Code is a professional discipline, not a style preference. As Martin writes, writing messy
code and promising to clean it later is the same as a doctor washing their hands being "too slow" —
the short-term excuse causes long-term harm.

**Writing clean code requires:**

1. Discipline — consistency even when deadlines are tight
2. Feedback loops — code review, pair programming, linting
3. Refactoring — continuous improvement, not big-bang rewrites
4. Empathy — write for the next developer (who might be you in 6 months)

---

## Quick Diagnostic — Is This Code Clean?

Ask these questions about any code you're reviewing or writing:

```
□ Can I understand what this function does in < 10 seconds?
□ Does every name reveal intent without needing a comment?
□ Is there any duplicated logic I could extract?
□ Are there any functions/classes trying to do more than one thing?
□ Are all test cases present, readable, and fast?
□ Am I leaving this in better shape than I found it?
```

If any answer is "no" — that's where to start.
