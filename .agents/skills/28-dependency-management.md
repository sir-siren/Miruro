---
name: dependency-management
trigger: "dependency management, composition root, IoC container, wiring, dependency injection container, NestJS DI, tsyringe"
---

# Dependency Management & Composition Root

Managing dependencies is the practical application of DIP at scale. This skill covers how to wire
dependencies together cleanly — with or without a DI container.

---

## The Composition Root Pattern

**The Composition Root is the single place in the entire application where concrete classes are
instantiated and wired together.** Everything else depends on interfaces.

```
┌─────────────────────────────────────┐
│           main.ts (Composition Root) │
│                                      │
│  new MySQLRepo()        ─────────────┼──→ implements OrderRepository
│  new StripeGateway()    ─────────────┼──→ implements PaymentGateway
│  new SendGridMailer()   ─────────────┼──→ implements EmailService
│                                      │
│  new OrderService(repo, gateway, mail) → depends on interfaces
│  new OrderController(orderService)    → depends on use case
│                                      │
│  app.post('/orders', controller.handle)
└─────────────────────────────────────┘
```

---

## Manual Composition Root (No Container)

Best for small-to-medium apps. Clear, transparent, testable:

```typescript
// src/main.ts — the ONLY file that imports concrete implementations

import { PrismaClient } from "@prisma/client";
import { PrismaOrderRepository } from "@/adapters/db/prisma-order-repository";
import { StripePaymentGateway } from "@/adapters/payments/stripe-gateway";
import { SendGridEmailService } from "@/adapters/email/sendgrid-service";
import { PlaceOrderUseCase } from "@/application/place-order.use-case";
import { GetOrderUseCase } from "@/application/get-order.use-case";
import { OrderController } from "@/adapters/http/order-controller";
import { createExpressApp } from "@/infrastructure/express-app";

// Infrastructure setup
const prisma = new PrismaClient();
const app = createExpressApp();

// Repositories (Infrastructure)
const orderRepo = new PrismaOrderRepository(prisma);

// Gateways (Infrastructure)
const paymentGateway = new StripePaymentGateway({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
});
const emailService = new SendGridEmailService(process.env.SENDGRID_API_KEY!);

// Use Cases (Application)
const placeOrder = new PlaceOrderUseCase(
    orderRepo,
    paymentGateway,
    emailService,
);
const getOrder = new GetOrderUseCase(orderRepo);

// Controllers (Adapters)
const orderController = new OrderController(placeOrder, getOrder);

// Route Registration
app.post("/api/orders", orderController.handlePlaceOrder.bind(orderController));
app.get(
    "/api/orders/:id",
    orderController.handleGetOrder.bind(orderController),
);

// Start
app.listen(process.env.PORT ?? 3000);
```

---

## Module-Based Composition (Feature Modules)

For larger apps, compose by feature module:

```typescript
// modules/order/order.module.ts
export function createOrderModule(deps: {
    db: DatabaseClient;
    mailer: EmailClient;
}) {
    const repo = new PrismaOrderRepository(deps.db);
    const gateway = new StripePaymentGateway(process.env.STRIPE_KEY!);
    const email = new SendGridEmailService(deps.mailer);
    const placeOrder = new PlaceOrderUseCase(repo, gateway, email);
    const getOrder = new GetOrderUseCase(repo);
    const controller = new OrderController(placeOrder, getOrder);

    return { controller, router: buildOrderRouter(controller) };
}

// main.ts — compose modules
const db = new PrismaClient();
const mailer = new NodeMailer(smtpConfig);

const orderModule = createOrderModule({ db, mailer });
const userModule = createUserModule({ db, mailer });

app.use("/api/orders", orderModule.router);
app.use("/api/users", userModule.router);
```

---

## DI Containers (When to Use Them)

Use a DI container when:

- App has **50+ services** and manual wiring is becoming a maintenance burden
- You need **lifecycle management** (singleton, transient, scoped per request)
- You need **lazy initialization** of expensive services

Popular TypeScript options:

- **tsyringe** (Microsoft) — lightweight, decorator-based
- **InversifyJS** — mature, feature-rich
- **NestJS DI** — framework-integrated, opinionated

### tsyringe Example

```typescript
import "reflect-metadata";
import { container, injectable, inject } from "tsyringe";

// Register concrete types
container.register("OrderRepository", { useClass: PrismaOrderRepository });
container.register("PaymentGateway", { useClass: StripePaymentGateway });

@injectable()
class PlaceOrderUseCase {
    constructor(
        @inject("OrderRepository") private repo: OrderRepository,
        @inject("PaymentGateway") private payments: PaymentGateway,
    ) {}
}

// Resolve in composition root
const useCase = container.resolve(PlaceOrderUseCase);
```

---

## Testing With Composition

The power of a Composition Root: tests compose their own dependency graph:

```typescript
// tests/order/place-order.test.ts — test composition root
function buildTestDependencies() {
    const repo = new InMemoryOrderRepository();
    const payments = new MockPaymentGateway();
    const email = new SpyEmailService();

    return {
        useCase: new PlaceOrderUseCase(repo, payments, email),
        repo,
        payments,
        email,
    };
}

describe("PlaceOrderUseCase", () => {
    it("charges payment and saves order", async () => {
        const { useCase, repo, payments } = buildTestDependencies();

        await useCase.execute(testCommand);

        expect(payments.chargedAmounts).toHaveLength(1);
        expect(await repo.findAll()).toHaveLength(1);
    });

    it("does not save order when payment fails", async () => {
        const { useCase, repo, payments } = buildTestDependencies();
        payments.failNextCharge("Insufficient funds");

        await expect(useCase.execute(testCommand)).rejects.toThrow(
            PaymentFailedError,
        );
        expect(await repo.findAll()).toHaveLength(0);
    });
});
```

---

## Dependency Lifetime Management

| Lifetime      | Created           | Destroyed    | Use For                        |
| ------------- | ----------------- | ------------ | ------------------------------ |
| **Singleton** | Once, app startup | App shutdown | DB connections, config, logger |
| **Scoped**    | Once per request  | Request end  | Unit of work, request context  |
| **Transient** | Every injection   | GC'd         | Stateless services, validators |

```typescript
// Manual lifetime management
const logger = new Logger(); // singleton — reused everywhere
const config = AppConfig.load(); // singleton — immutable after load

app.use((req, res, next) => {
    // Scoped — new UnitOfWork per request
    const uow = new PrismaUnitOfWork(prisma);
    req.uow = uow;
    res.on("finish", () => uow.dispose());
    next();
});
```

---

## Dependency Management Checklist

- [ ] Is there a single Composition Root that owns all `new ConcreteImpl()` calls?
- [ ] Do service/use-case classes receive all dependencies via constructor?
- [ ] Are concrete classes NEVER imported inside domain or application layers?
- [ ] Can any class be swapped for a test double by changing only the composition root?
- [ ] Are long-lived resources (DB connections) created once and shared?
- [ ] Are per-request resources cleaned up after request completion?
