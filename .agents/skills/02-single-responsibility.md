---
name: single-responsibility-principle
trigger: "SRP, single responsibility, god class, class has too many jobs, separation of concerns at class level"
---

# Single Responsibility Principle (SRP)

> **"A class should have only one reason to change."**
> — Robert C. Martin

More precisely: a module/class/function should be responsible to **one actor** — one group of
stakeholders whose requirements drive change. If two different teams could mandate changes to the
same class, it has two responsibilities.

---

## The Real Definition (Often Misunderstood)

SRP is NOT "a class should do only one thing." It's about **change drivers**:

- The `Invoice` class changing because the accounting team changes billing logic ← one actor ✓
- The `Invoice` class changing because the printing team changes PDF format ← **second actor, SRP violation** ✗

```typescript
// ❌ Violates SRP — two actors: Finance team + DevOps/Ops team
class Invoice {
    calculateTotal(): number {
        /* Finance logic */
    }
    formatForPDF(): string {
        /* Ops/printing logic */
    }
    saveToDatabase(): void {
        /* Persistence logic */
    }
}

// ✅ Correct — each class has one reason to change
class Invoice {
    constructor(
        public readonly items: LineItem[],
        public readonly customerId: string,
    ) {}

    calculateTotal(): number {
        return this.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    }
}

class InvoiceFormatter {
    toPDF(invoice: Invoice): Buffer {
        /* Formatting logic */
    }
    toHTML(invoice: Invoice): string {
        /* HTML logic */
    }
}

class InvoiceRepository {
    async save(invoice: Invoice): Promise<void> {
        /* DB logic */
    }
    async findById(id: string): Promise<Invoice | null> {
        /* DB logic */
    }
}
```

---

## How to Detect SRP Violations

### Warning Signs

1. **The "and" smell** — "This class handles authentication _and_ sends emails _and_ logs activity"
2. **God class** — over 300 lines with unrelated method groups
3. **Change tsunami** — a single user story forces edits across one large file in multiple spots
4. **Multiple import groups** — the class imports both `nodemailer` and `pg` and `pdfkit`
5. **Divergent change** — you modify this class every time accounting rules change AND every time the UI changes

### Litmus Test — The "Reason To Change" Question

For each class, ask: "Who would ask me to change this?"

- If the answer involves two different teams/roles → SRP violation

---

## Decomposition Strategies

### Strategy 1: Extract Class

Pull out a coherent group of fields + methods into its own class.

```typescript
// Before: UserManager does authentication AND profile management
class UserManager {
  login(credentials: Credentials): Session { ... }
  logout(sessionId: string): void { ... }
  updateProfile(userId: string, data: ProfileData): void { ... }
  uploadAvatar(userId: string, file: Buffer): string { ... }
}

// After: Split by actor
class AuthService {
  login(credentials: Credentials): Session { ... }
  logout(sessionId: string): void { ... }
}

class UserProfileService {
  updateProfile(userId: string, data: ProfileData): void { ... }
  uploadAvatar(userId: string, file: Buffer): Promise<string> { ... }
}
```

### Strategy 2: Extract Function Module

When a class just has too many utility methods, extract them into focused modules.

```typescript
// ❌ OrderService handles calculation + validation + notification
// ✅ Break into:
// - calculateOrderTotal(items: LineItem[]): number
// - validateOrder(order: Order): ValidationResult
// - notifyOrderStatus(order: Order, channel: NotificationChannel): void
```

### Strategy 3: Façade Pattern

When external code depends on the monolith, keep a thin façade that delegates:

```typescript
class OrderFacade {
    constructor(
        private calculator: OrderCalculator,
        private validator: OrderValidator,
        private notifier: OrderNotifier,
    ) {}

    async processOrder(order: Order): Promise<OrderResult> {
        const validation = this.validator.validate(order);
        if (!validation.isValid)
            return { success: false, errors: validation.errors };

        const total = this.calculator.calculate(order);
        await this.notifier.notify(order);
        return { success: true, total };
    }
}
```

---

## SRP at Different Scales

| Scale               | SRP Means                                        |
| ------------------- | ------------------------------------------------ |
| **Function**        | Does exactly one thing, one level of abstraction |
| **Class**           | Responsible to one actor, one cohesive concept   |
| **Module/File**     | Groups related classes; one domain concern       |
| **Package/Service** | Deployed independently, owned by one team        |

---

## Common Mistakes

| Mistake                                           | Why It's Wrong                                              |
| ------------------------------------------------- | ----------------------------------------------------------- |
| "One method = SRP compliance"                     | SRP is about change reasons, not method count               |
| Over-splitting into micro-classes                 | Leads to scattered logic that's hard to trace               |
| Splitting by layer (controller/service/repo) only | Layers ≠ responsibilities — a service can still violate SRP |
| Ignoring cohesion                                 | Methods that always change together belong together         |

---

## Rules

- Describe every class in one sentence. No "and."
- When a file imports from 3+ unrelated domains, it probably violates SRP
- Aim for high cohesion within a class: all methods use most of the same fields
- Keep files under 300 lines — a soft signal that forces SRP thinking
