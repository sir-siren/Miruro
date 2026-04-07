---
name: master-index
trigger: "which skill, what principle, where to find, skill index, SOLID clean code index, principle lookup"
---

# Master Index — SOLID & Clean Code Skills

This file is your starting point. Use it to route to the right skill for any situation.

---

## Quick Lookup — By Symptom

| What You're Seeing                               | Root Cause                            | Load This Skill                |
| ------------------------------------------------ | ------------------------------------- | ------------------------------ |
| Class is 500+ lines                              | SRP violation / low cohesion          | `02-single-responsibility.md`  |
| Adding a feature requires editing existing files | OCP violation                         | `03-open-closed.md`            |
| `instanceof` checks in polymorphic code          | LSP violation                         | `04-liskov-substitution.md`    |
| Mocks are huge because interfaces are bloated    | ISP violation                         | `05-interface-segregation.md`  |
| Can't unit test without a real database          | DIP violation                         | `06-dependency-inversion.md`   |
| Variable names like `d`, `x`, `data`, `tmp`      | Bad naming                            | `08-naming.md`                 |
| Functions over 30 lines                          | Function size / single responsibility | `09-functions.md`              |
| Comments outnumber code / comments lie           | Bad commenting                        | `10-comments.md`               |
| File is hard to scan, no visual structure        | Formatting                            | `11-formatting.md`             |
| `null` returned everywhere, runtime NPEs         | Error handling                        | `12-error-handling.md`         |
| Class has unrelated methods, low cohesion        | Class design                          | `13-classes.md`                |
| Tests are flaky, slow, or coupled                | Test quality                          | `14-unit-testing.md`           |
| Code "smells" but can't name why                 | Code smells                           | `15-code-smells.md`            |
| Same logic in 3+ places                          | DRY violation                         | `16-dry-principle.md`          |
| Over-engineered for simple problem               | KISS / YAGNI                          | `17-kiss-yagni.md`             |
| Need to restructure code without breaking it     | Refactoring                           | `18-refactoring.md`            |
| Need a pattern for a recurring design problem    | Design patterns                       | `19-design-patterns.md`        |
| Business logic mixed with UI or DB code          | SoC violation                         | `20-separation-of-concerns.md` |
| Framework is entangled with business rules       | Architecture                          | `21-clean-architecture.md`     |
| Long method chains navigating object graphs      | Law of Demeter                        | `22-law-of-demeter.md`         |
| Module with unrelated responsibilities           | Cohesion/Coupling                     | `23-cohesion-and-coupling.md`  |
| Shared mutable state causing bugs                | Immutability                          | `24-immutability.md`           |
| Domain logic scattered in services not objects   | DDD / Anemic model                    | `25-domain-driven-design.md`   |
| TypeScript `any` everywhere, weak types          | TS clean code                         | `26-typescript-clean-code.md`  |
| Recognizing classic bad patterns                 | Anti-patterns                         | `27-anti-patterns.md`          |
| Wiring dependencies / DI container               | Dependency management                 | `28-dependency-management.md`  |
| Writing or receiving code review feedback        | Code review                           | `29-code-review.md`            |

---

## Load Order by Task

### Writing a New Feature

1. `01-solid-overview.md` — mental framework
2. `25-domain-driven-design.md` — model the domain
3. `21-clean-architecture.md` — where does this code live?
4. `09-functions.md` — write clean functions
5. `08-naming.md` — name things well
6. `14-unit-testing.md` — write the tests

### Reviewing Someone's Code

1. `29-code-review.md` — review process and checklist
2. `15-code-smells.md` — identify specific smells
3. Relevant SOLID skill for any design violations found

### Refactoring Existing Code

1. `15-code-smells.md` — identify the smells
2. `18-refactoring.md` — apply safe refactoring techniques
3. Relevant principle skill for the target design

### Designing a New System

1. `21-clean-architecture.md` — overall structure
2. `20-separation-of-concerns.md` — layer boundaries
3. `06-dependency-inversion.md` — dependency direction
4. `23-cohesion-and-coupling.md` — module boundaries
5. `25-domain-driven-design.md` — if domain is complex

### Debugging Testability Problems

1. `06-dependency-inversion.md` — inject dependencies
2. `28-dependency-management.md` — composition root
3. `14-unit-testing.md` — test doubles and patterns

---

## SOLID Principles — One-Line Rules

| Principle                     | One Line                          | File                          |
| ----------------------------- | --------------------------------- | ----------------------------- |
| **S** — Single Responsibility | One reason to change              | `02-single-responsibility.md` |
| **O** — Open/Closed           | Extend without modifying          | `03-open-closed.md`           |
| **L** — Liskov Substitution   | Subtypes are always substitutable | `04-liskov-substitution.md`   |
| **I** — Interface Segregation | No method you don't use           | `05-interface-segregation.md` |
| **D** — Dependency Inversion  | Depend on abstractions            | `06-dependency-inversion.md`  |

---

## Clean Code Principles — One-Line Rules

| Principle          | One Line                    | File                   |
| ------------------ | --------------------------- | ---------------------- |
| **Naming**         | Names reveal intent         | `08-naming.md`         |
| **Functions**      | Do one thing, be small      | `09-functions.md`      |
| **Comments**       | Explain WHY, not WHAT       | `10-comments.md`       |
| **Formatting**     | Code reads like a newspaper | `11-formatting.md`     |
| **Error Handling** | Exceptions with context     | `12-error-handling.md` |
| **Classes**        | Small and cohesive          | `13-classes.md`        |
| **Testing**        | F.I.R.S.T., one concept     | `14-unit-testing.md`   |
| **DRY**            | Single source of truth      | `16-dry-principle.md`  |
| **KISS**           | Simplest thing that works   | `17-kiss-yagni.md`     |
| **YAGNI**          | Don't build it until needed | `17-kiss-yagni.md`     |

---

## The Meta-Principle Behind All of Them

> **Write code for humans first. Machines don't care about your variable names.**

Every principle — SOLID, Clean Code, DDD — exists to answer the same question:
**"Will the next developer (or future you) be able to understand, change, and extend this safely?"**

If the answer is yes: you're doing it right.
If the answer is no: pick a skill from this index and apply it.
