---
name: dependency-inversion-principle
trigger: "DIP, dependency inversion, depend on abstractions, IoC, inversion of control, dependency injection, concrete dependencies"
---

# Dependency Inversion Principle (DIP)

> **"High-level modules should not depend on low-level modules. Both should depend on abstractions.
> Abstractions should not depend on details. Details should depend on abstractions."**
> — Robert C. Martin

The flow of control goes from high-level → low-level. DIP says the flow of **dependency** should
be inverted: both levels depend on an abstraction that sits between them.

---

## The Problem — Direct Concrete Dependencies

```typescript
// ❌ High-level OrderService directly imports low-level MySQLOrderRepository
import { MySQLOrderRepository } from "./mysql-order-repository";
import { SMTPEmailService } from "./smtp-email-service";

class OrderService {
    private repo = new MySQLOrderRepository(); // hardcoded concrete
    private email = new SMTPEmailService(); // hardcoded concrete

    async placeOrder(order: Order): Promise<void> {
        await this.repo.save(order);
        await this.email.send(order.customerEmail, "Order placed!");
    }
}

// Problems:
// - Can't test OrderService without a real MySQL database
// - Switching from MySQL to Postgres means editing OrderService
// - Switching from SMTP to SendGrid means editing OrderService
```

---

## The Fix — Depend on Abstractions

```typescript
// ✅ Abstractions (interfaces) sit between high-level and low-level

// The abstractions — owned by the high-level module
interface OrderRepository {
    save(order: Order): Promise<void>;
    findById(id: string): Promise<Order | null>;
}

interface EmailService {
    send(to: string, subject: string, body: string): Promise<void>;
}

// High-level module — depends ONLY on abstractions
class OrderService {
    constructor(
        private repo: OrderRepository, // injected abstraction
        private email: EmailService, // injected abstraction
    ) {}

    async placeOrder(order: Order): Promise<void> {
        await this.repo.save(order);
        await this.email.send(
            order.customerEmail,
            "Order Confirmation",
            `Order ${order.id} placed`,
        );
    }
}

// Low-level modules implement the abstraction
class MySQLOrderRepository implements OrderRepository {
    async save(order: Order): Promise<void> {
        /* MySQL impl */
    }
    async findById(id: string): Promise<Order | null> {
        /* MySQL impl */
    }
}

class SendGridEmailService implements EmailService {
    async send(to: string, subject: string, body: string): Promise<void> {
        /* SendGrid impl */
    }
}

// Composition root (entry point / main.ts) wires everything
const orderService = new OrderService(
    new MySQLOrderRepository(),
    new SendGridEmailService(),
);
```

---

## Dependency Injection Patterns

### 1. Constructor Injection (Preferred)

```typescript
class UserService {
    constructor(
        private readonly repo: UserRepository,
        private readonly hasher: PasswordHasher,
        private readonly events: EventBus,
    ) {}
}
```

**Why preferred:** Dependencies are explicit, immutable after construction, and easy to mock.

### 2. Method Injection

Use when dependency varies per call, not per instance:

```typescript
class ReportGenerator {
    generate(data: ReportData, formatter: ReportFormatter): string {
        return formatter.format(data);
    }
}
```

### 3. Property Injection (Avoid in most cases)

Only acceptable for optional dependencies with sane defaults:

```typescript
class Logger {
    writer: LogWriter = new ConsoleLogWriter(); // default, overridable
}
```

---

## DIP and the Dependency Rule

In Clean Architecture, the Dependency Rule is DIP applied at scale:

```
[ Frameworks/DB/UI ]  →  [ Interface Adapters ]  →  [ Use Cases ]  →  [ Entities ]
         ↑                        ↑                       ↑
         └────────────────────────┴───────────────────────┘
                    All arrows point INWARD only
```

- Inner layers (Entities, Use Cases) never import from outer layers
- Outer layers implement interfaces defined by inner layers

---

## Testing Benefits of DIP

```typescript
// Unit test with mock — no database needed
class MockOrderRepository implements OrderRepository {
    private orders: Order[] = [];
    async save(order: Order): Promise<void> {
        this.orders.push(order);
    }
    async findById(id: string): Promise<Order | null> {
        return this.orders.find((o) => o.id === id) ?? null;
    }
}

class MockEmailService implements EmailService {
    sent: Array<{ to: string; subject: string }> = [];
    async send(to: string, subject: string): Promise<void> {
        this.sent.push({ to, subject });
    }
}

// Test is fast, isolated, deterministic
const repo = new MockOrderRepository();
const email = new MockEmailService();
const service = new OrderService(repo, email);

await service.placeOrder(testOrder);
expect(repo.orders).toHaveLength(1);
expect(email.sent[0].to).toBe(testOrder.customerEmail);
```

---

## DIP vs Dependency Injection

| Term              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| **DIP**           | Design _principle_ — depend on abstractions                      |
| **DI**            | Design _pattern_ — technique to supply dependencies from outside |
| **IoC Container** | _Framework_ — automates DI (NestJS, InversifyJS, tsyringe)       |

DI is one way to achieve DIP. You can achieve DIP without a container via the Composition Root pattern.

---

## Composition Root Pattern

All wiring happens in **one place** — the entry point. Never call `new ConcreteImpl()` inside business logic:

```typescript
// main.ts — the ONLY place allowed to know about concrete implementations
import { MySQLOrderRepository } from "@/infra/mysql-order-repository";
import { SendGridEmailService } from "@/infra/sendgrid-email-service";
import { OrderService } from "@/domain/order-service";

const db = new MySQLOrderRepository(process.env.DATABASE_URL);
const mailer = new SendGridEmailService(process.env.SENDGRID_KEY);
const orderService = new OrderService(db, mailer);

export { orderService };
```

---

## DIP Checklist

- [ ] Does any business logic class import from a concrete infrastructure module?
- [ ] Are there `new ConcreteClass()` calls inside service/domain code?
- [ ] Can you swap the database layer without touching business logic files?
- [ ] Can you unit test all business logic without setting up real databases or networks?
- [ ] Are interfaces defined near the consumer (high-level), not near the implementation (low-level)?

All "no" to violations → DIP holds.
