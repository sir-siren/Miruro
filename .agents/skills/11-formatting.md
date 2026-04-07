---
name: clean-code-formatting
trigger: "formatting, code structure, file organization, vertical spacing, horizontal spacing, line length, indentation"
---

# Clean Code — Formatting

> **"Code formatting is about communication, and communication is the professional developer's
> first order of business."**
> — Robert C. Martin

Formatting is not cosmetic. It is communication. Consistent formatting signals professionalism and
makes code scannable. Use automated formatters (Prettier, dprint) to enforce it — never debate
formatting in code review.

---

## Vertical Formatting — The Newspaper Metaphor

A source file should read like a newspaper article:

- **Headline at the top** — the most important concept first (exported class/function)
- **High-level overview first** — orchestration/public API near the top
- **Details below** — implementation details lower down
- **Related things close together** — concepts that work together live near each other

---

## Vertical Openness — Separate Concepts

Use blank lines to separate concepts. Group lines that are closely related:

```typescript
// ❌ No visual separation — everything runs together
import { UserRepository } from "./user-repository";
import { EmailService } from "./email-service";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1_000;
class AuthService {
    constructor(
        private repo: UserRepository,
        private email: EmailService,
    ) {}
    async login(email: string, password: string): Promise<Session> {
        const user = await this.repo.findByEmail(email);
        if (!user) throw new InvalidCredentialsError();
        if (user.failedAttempts >= MAX_LOGIN_ATTEMPTS)
            throw new AccountLockedError();
        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
            await this.repo.incrementFailedAttempts(user.id);
            throw new InvalidCredentialsError();
        }
        await this.repo.resetFailedAttempts(user.id);
        return Session.create(user);
    }
}

// ✅ Blank lines create visual paragraphs
import { UserRepository } from "./user-repository";
import { EmailService } from "./email-service";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1_000;

class AuthService {
    constructor(
        private readonly repo: UserRepository,
        private readonly email: EmailService,
    ) {}

    async login(email: string, password: string): Promise<Session> {
        const user = await this.findUser(email);
        this.assertAccountNotLocked(user);

        const isValid = await verifyPassword(password, user.passwordHash);
        await this.handleLoginAttempt(user, isValid);

        return Session.create(user);
    }

    private async findUser(email: string): Promise<User> {
        const user = await this.repo.findByEmail(email);
        if (!user) throw new InvalidCredentialsError();
        return user;
    }

    private assertAccountNotLocked(user: User): void {
        if (user.failedAttempts >= MAX_LOGIN_ATTEMPTS)
            throw new AccountLockedError();
    }

    private async handleLoginAttempt(
        user: User,
        isValid: boolean,
    ): Promise<void> {
        if (!isValid) {
            await this.repo.incrementFailedAttempts(user.id);
            throw new InvalidCredentialsError();
        }
        await this.repo.resetFailedAttempts(user.id);
    }
}
```

---

## Vertical Distance Rules

| Rule                           | Explanation                                              |
| ------------------------------ | -------------------------------------------------------- |
| **Related concepts close**     | Methods that call each other should be near each other   |
| **Caller above callee**        | Top-down flow: caller first, helper functions below      |
| **Variables near usage**       | Declare variables just before first use, not at file top |
| **Instance vars at class top** | Exception: class fields go at the top                    |
| **Dependent functions close**  | If A calls B, A should be physically close to B          |

```typescript
// ✅ Caller above callee — reads top-down like a story
function buildReport(data: ReportData): Report {
  const sections = buildSections(data)       // caller
  const summary = buildSummary(data)         // caller
  return { sections, summary, metadata: buildMetadata() }
}

function buildSections(data: ReportData): Section[] { ... }   // callee
function buildSummary(data: ReportData): string { ... }       // callee
function buildMetadata(): Metadata { ... }                    // callee
```

---

## Horizontal Formatting

### Line Length

- **Aim for < 100 characters per line**
- Hard limit: **120 characters** (enforced by Prettier/ESLint)
- Never sacrifice readability by cramming code onto one line

```typescript
// ❌ Too wide — requires horizontal scrolling
const result = await database.users.findAll({
    where: { isActive: true, role: "admin", createdAt: { gte: thirtyDaysAgo } },
});

// ✅ Wrapped for readability
const result = await database.users.findAll({
    where: {
        isActive: true,
        role: "admin",
        createdAt: { gte: thirtyDaysAgo },
    },
});
```

### Horizontal Openness — Spaces Show Precedence

```typescript
// ❌ No visual cue for operator precedence
const result = a * b + c * d;

// ✅ Spaces after operators, alignment shows precedence
const result = a * b + c * d; // multiply binds tighter — no spaces around *
```

### Don't Align Assignments (Horizontal Alignment)

```typescript
// ❌ Alignment looks neat but makes diffs noisier and misleads readers
const firstName = "John";
const lastName = "Doe";
const email = "john@example.com";
const phoneNumber = "+1-555-1234";

// ✅ Standard alignment — consistent, diffable
const firstName = "John";
const lastName = "Doe";
const email = "john@example.com";
const phoneNumber = "+1-555-1234";
```

---

## File Organization Template (TypeScript)

```typescript
// 1. Module-level JSDoc (if public API)
// 2. Imports (grouped and sorted — see import rules)
// 3. Constants & Types (specific to this module)
// 4. Main class/function export
// 5. Helper functions/private implementations (top-down order)
// 6. Default export (if applicable)
```

---

## Import Ordering

```typescript
// 1. Node built-ins / Bun built-ins
import { readFileSync } from "node:fs";
import { join } from "node:path";

// 2. External packages
import { z } from "zod";
import type { Request, Response } from "express";

// 3. Internal absolute imports (@/)
import { UserRepository } from "@/repositories/user-repository";
import { logger } from "@/lib/logger";

// 4. Relative imports
import { validateUser } from "./validators";
import type { UserDTO } from "./types";
```

---

## Automated Enforcement

Never argue about formatting. Configure once, auto-enforce forever:

```json
// .prettierrc
{
    "semi": false,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
}
```

```json
// eslint.config rules for import order
"import/order": ["error", {
  "groups": ["builtin", "external", "internal", "parent", "sibling"],
  "newlines-between": "always"
}]
```

---

## Formatting Checklist

- [ ] Are blank lines used to separate logical groups of code?
- [ ] Do callers appear above callees in the file?
- [ ] Are imports grouped and ordered consistently?
- [ ] Are lines under 100 characters?
- [ ] Is formatting enforced by a formatter (Prettier/dprint), not by hand?
- [ ] Is indentation consistent (spaces vs tabs configured in `.editorconfig`)?
