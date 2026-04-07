---
name: universal-skill-index
trigger: "skill index, which skill to load, all skills, skill list, route to skill, find skill"
---

# Universal Skill Index — All 40 Skills

Full routing guide. Use the symptom, language, or topic to find the right skill.

---

## Route by Language

| Language           | Primary Skill                | Also Load                     |
| ------------------ | ---------------------------- | ----------------------------- |
| **TypeScript**     | `32-typescript-universal.md` | `26-typescript-clean-code.md` |
| **React + TS**     | `33-react-clean-code.md`     | `32-typescript-universal.md`  |
| **Rust**           | `34-rust-clean-code.md`      | `31-universal-clean-code.md`  |
| **Go**             | `35-go-clean-code.md`        | `31-universal-clean-code.md`  |
| **Python**         | `36-python-clean-code.md`    | `31-universal-clean-code.md`  |
| **Zig**            | `37-zig-clean-code.md`       | `31-universal-clean-code.md`  |
| **Multi-language** | `38-polyglot-patterns.md`    | language skills               |
| **Any language**   | `31-universal-clean-code.md` | —                             |

---

## Route by Topic

| Topic                         | Skill File                     |
| ----------------------------- | ------------------------------ |
| SOLID overview                | `01-solid-overview.md`         |
| Single Responsibility (SRP)   | `02-single-responsibility.md`  |
| Open/Closed (OCP)             | `03-open-closed.md`            |
| Liskov Substitution (LSP)     | `04-liskov-substitution.md`    |
| Interface Segregation (ISP)   | `05-interface-segregation.md`  |
| Dependency Inversion (DIP)    | `06-dependency-inversion.md`   |
| Clean code overview           | `07-clean-code-overview.md`    |
| Naming                        | `08-naming.md`                 |
| Functions                     | `09-functions.md`              |
| Comments                      | `10-comments.md`               |
| Formatting                    | `11-formatting.md`             |
| Error handling                | `12-error-handling.md`         |
| Classes                       | `13-classes.md`                |
| Unit testing                  | `14-unit-testing.md`           |
| Code smells                   | `15-code-smells.md`            |
| DRY principle                 | `16-dry-principle.md`          |
| KISS + YAGNI                  | `17-kiss-yagni.md`             |
| Refactoring techniques        | `18-refactoring.md`            |
| Design patterns               | `19-design-patterns.md`        |
| Separation of concerns        | `20-separation-of-concerns.md` |
| Clean architecture            | `21-clean-architecture.md`     |
| Law of Demeter                | `22-law-of-demeter.md`         |
| Cohesion & coupling           | `23-cohesion-and-coupling.md`  |
| Immutability & pure functions | `24-immutability.md`           |
| Domain-Driven Design          | `25-domain-driven-design.md`   |
| TypeScript type system        | `26-typescript-clean-code.md`  |
| Anti-patterns                 | `27-anti-patterns.md`          |
| Dependency management / DI    | `28-dependency-management.md`  |
| Code review                   | `29-code-review.md`            |
| Master SOLID+CleanCode index  | `30-master-index.md`           |
| Universal clean code          | `31-universal-clean-code.md`   |
| TypeScript (all practices)    | `32-typescript-universal.md`   |
| React (component design)      | `33-react-clean-code.md`       |
| Rust (ownership, errors)      | `34-rust-clean-code.md`        |
| Go (interfaces, goroutines)   | `35-go-clean-code.md`          |
| Python (type hints, async)    | `36-python-clean-code.md`      |
| Zig (comptime, allocators)    | `37-zig-clean-code.md`         |
| Cross-language / FFI          | `38-polyglot-patterns.md`      |
| Performance optimization      | `39-performance-clean-code.md` |

---

## Route by Symptom (Quick Fix)

| Symptom                                    | Load                           |
| ------------------------------------------ | ------------------------------ |
| God class / file too big                   | `02-single-responsibility.md`  |
| Adding feature breaks existing code        | `03-open-closed.md`            |
| `instanceof` / `type` checks in switch     | `04-liskov-substitution.md`    |
| Interface too fat to implement             | `05-interface-segregation.md`  |
| Can't test without real DB                 | `06-dependency-inversion.md`   |
| Cryptic variable names                     | `08-naming.md`                 |
| 80-line function                           | `09-functions.md`              |
| Comments outnumber code                    | `10-comments.md`               |
| File hard to scan                          | `11-formatting.md`             |
| Null crashes everywhere                    | `12-error-handling.md`         |
| Class with 20+ methods                     | `13-classes.md`                |
| Tests are slow / flaky                     | `14-unit-testing.md`           |
| "This smells but I can't say why"          | `15-code-smells.md`            |
| Same logic in 3 places                     | `16-dry-principle.md`          |
| Over-engineered for the problem            | `17-kiss-yagni.md`             |
| Need to restructure safely                 | `18-refactoring.md`            |
| Recognizing which pattern to use           | `19-design-patterns.md`        |
| Business logic in UI layer                 | `20-separation-of-concerns.md` |
| Framework entangled with domain            | `21-clean-architecture.md`     |
| Long method chain `a.b().c().d()`          | `22-law-of-demeter.md`         |
| Unrelated methods in same class            | `23-cohesion-and-coupling.md`  |
| Shared mutable state bugs                  | `24-immutability.md`           |
| Services do everything, objects do nothing | `25-domain-driven-design.md`   |
| TypeScript `any` soup                      | `26-typescript-clean-code.md`  |
| "I know this is bad but can't name it"     | `27-anti-patterns.md`          |
| Wiring dependencies is a mess              | `28-dependency-management.md`  |
| Giving/receiving code review               | `29-code-review.md`            |
| N+1 queries / slow code                    | `39-performance-clean-code.md` |
| TypeScript + Rust / TS + Python            | `38-polyglot-patterns.md`      |
| `.unwrap()` everywhere in Rust             | `34-rust-clean-code.md`        |
| Ignored errors in Go (`_ = err`)           | `35-go-clean-code.md`          |
| No type hints in Python                    | `36-python-clean-code.md`      |
| React component is a god component         | `33-react-clean-code.md`       |
| Zig memory leaks                           | `37-zig-clean-code.md`         |

---

## Recommended Load Sets

### "I'm building a new feature"

`31` → `07` → `21` → language skill → `09` → `08` → `14`

### "I'm reviewing a PR"

`29` → `15` → `31` → language skill

### "I'm debugging why tests are hard to write"

`06` → `28` → `14` → language skill

### "I need to refactor legacy code"

`15` → `18` → `01` → relevant SOLID skills

### "I'm designing a new service from scratch"

`21` → `25` → `20` → `06` → `23` → language skill
