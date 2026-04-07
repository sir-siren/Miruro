---
name: solid-overview
trigger: "SOLID principles, OOP design, object-oriented architecture, design principles overview"
---

# SOLID Principles — Master Overview

> Coined by Robert C. Martin (Uncle Bob). SOLID is an acronym for five design principles that make
> software designs more understandable, flexible, and maintainable. Apply them to avoid tight
> coupling, fragility, and rigidity.

---

## The Five Principles At a Glance

| Letter | Principle             | One-Line Rule                                     |
| ------ | --------------------- | ------------------------------------------------- |
| **S**  | Single Responsibility | A class/module has ONE reason to change           |
| **O**  | Open/Closed           | Open for extension, closed for modification       |
| **L**  | Liskov Substitution   | Subtypes must be substitutable for base types     |
| **I**  | Interface Segregation | No client should depend on methods it doesn't use |
| **D**  | Dependency Inversion  | Depend on abstractions, not concretions           |

---

## Why SOLID Matters

### Without SOLID — The Three Rots

- **Rigidity** — one change cascades into dozens of forced changes elsewhere
- **Fragility** — code breaks in unexpected places when you touch something seemingly unrelated
- **Immobility** — you can't extract and reuse a module without dragging its entire dependency tree

### With SOLID

- Each module can be changed, tested, and deployed independently
- Adding features doesn't require editing existing tested code (OCP)
- Mocking and unit testing become trivial (DIP)
- Interfaces stay lean and contextual (ISP)
- Class hierarchies remain behaviorally correct (LSP)

---

## SOLID in TypeScript — Quick Diagnostic

```typescript
// ❌ VIOLATES all five in one god-class
class UserManager {
    constructor(private db: MySQLDatabase) {} // DIP violation — concrete dep

    saveUser(user: User) {
        this.db.save(user);
    }
    sendEmail(user: User) {
        /* SMTP logic here */
    } // SRP violation
    generateReport(users: User[]) {
        /* PDF logic */
    } // SRP violation
    validateAdmin(user: User) {
        return user.role === "admin";
    } // mixed concern
}

// ✅ SOLID-compliant decomposition
interface UserRepository {
    save(user: User): Promise<void>;
}
interface EmailService {
    send(to: string, body: string): Promise<void>;
}
interface ReportGenerator {
    generate(users: User[]): Promise<Buffer>;
}

class UserService {
    constructor(
        private repo: UserRepository, // DIP ✓
        private email: EmailService, // DIP ✓
    ) {}

    async registerUser(user: User): Promise<void> {
        await this.repo.save(user);
        await this.email.send(user.email, "Welcome!");
    }
}
```

---

## Load Order for Deep Dives

When working on a specific violation, load the dedicated skill:

| Principle | Skill File                    |
| --------- | ----------------------------- |
| SRP       | `02-single-responsibility.md` |
| OCP       | `03-open-closed.md`           |
| LSP       | `04-liskov-substitution.md`   |
| ISP       | `05-interface-segregation.md` |
| DIP       | `06-dependency-inversion.md`  |

---

## SOLID + Clean Code Synergy

SOLID and Clean Code are complementary, not competing:

- **Clean Code** governs _expression_ — how you write individual functions, name things, structure files
- **SOLID** governs _architecture_ — how modules relate to each other
- A codebase needs **both**: SOLID architecture with messy code is still hard to maintain; clean code in a god-class is still a design failure

---

## Anti-Pattern Checklist

Before shipping any class or module, verify:

- [ ] Can I describe this class's responsibility in one sentence without "and"?
- [ ] If I add a new feature, do I modify this file or create a new one?
- [ ] Can I swap the implementation of any dependency without changing this class?
- [ ] Does every method in the interface make sense for every consumer?
- [ ] Can I instantiate this class in a test without spinning up a database/network?

All "yes" → you're solid (pun intended).
