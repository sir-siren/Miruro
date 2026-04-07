---
name: clean-architecture
trigger: "clean architecture, Uncle Bob architecture, use cases, entities, ports and adapters, hexagonal architecture, dependency rule"
---

# Clean Architecture

> **"The architecture should scream the intent of the system."**
> — Robert C. Martin

Clean Architecture (Uncle Bob, 2012) is a layered architecture where **business rules are
completely independent** of frameworks, databases, UI, and external agencies.

---

## The Dependency Rule

> **Source code dependencies must point only inward — toward higher-level policies.**

Nothing in an inner ring can know anything about something in an outer ring:

```
       ┌───────────────────────────────────────┐
       │           Frameworks & Drivers         │  Express, React, Prisma, Redis
       │   ┌───────────────────────────────┐   │
       │   │      Interface Adapters        │   │  Controllers, Presenters, Gateways
       │   │   ┌───────────────────────┐   │   │
       │   │   │    Application Layer   │   │   │  Use Cases / Services
       │   │   │   ┌───────────────┐   │   │   │
       │   │   │   │    Entities    │   │   │   │  Business Objects & Rules
       │   │   │   └───────────────┘   │   │   │
       │   │   └───────────────────────┘   │   │
       │   └───────────────────────────────┘   │
       └───────────────────────────────────────┘
                 ← All arrows point INWARD →
```

---

## The Four Layers

### 1. Entities (Innermost — Enterprise Business Rules)

Pure domain objects. No framework dependencies. These survive ANY technology change.

```typescript
// entities/order.ts
// Zero imports from external packages. Pure TypeScript.

export class Order {
    private _status: OrderStatus = "pending";

    constructor(
        readonly id: OrderId,
        readonly customerId: CustomerId,
        private readonly _items: ReadonlyArray<OrderItem>,
    ) {
        if (_items.length === 0)
            throw new DomainError("Order must have at least one item");
    }

    get items(): ReadonlyArray<OrderItem> {
        return this._items;
    }
    get status(): OrderStatus {
        return this._status;
    }

    calculateTotal(): Money {
        return this._items.reduce(
            (sum, item) => sum.add(item.total()),
            Money.zero(),
        );
    }

    confirm(): void {
        if (this._status !== "pending")
            throw new DomainError("Only pending orders can be confirmed");
        this._status = "confirmed";
    }
}
```

### 2. Use Cases / Application Layer (Orchestration)

Contains application-specific business rules. Orchestrates entities and interfaces. Knows about
interfaces but NOT implementations.

```typescript
// use-cases/place-order.ts

interface OrderRepository {
    save(order: Order): Promise<void>;
}
interface PaymentGateway {
    charge(amount: Money, method: PaymentMethod): Promise<ChargeResult>;
}
interface EventBus {
    publish(event: DomainEvent): Promise<void>;
}

export interface PlaceOrderCommand {
    customerId: string;
    items: Array<{ productId: string; qty: number; price: number }>;
    paymentMethod: PaymentMethod;
}

export class PlaceOrderUseCase {
    constructor(
        private readonly orders: OrderRepository,
        private readonly payments: PaymentGateway,
        private readonly events: EventBus,
    ) {}

    async execute(command: PlaceOrderCommand): Promise<Order> {
        const items = command.items.map(
            (i) => new OrderItem(i.productId, i.qty, Money.fromCents(i.price)),
        );
        const order = new Order(OrderId.generate(), command.customerId, items);

        const charge = await this.payments.charge(
            order.calculateTotal(),
            command.paymentMethod,
        );
        if (!charge.succeeded) throw new PaymentFailedError(charge.reason);

        order.confirm();
        await this.orders.save(order);
        await this.events.publish(new OrderPlacedEvent(order));

        return order;
    }
}
```

### 3. Interface Adapters (Controllers, Presenters, Gateways)

Convert data between use cases and external systems. This is where frameworks touch the domain.

```typescript
// adapters/http/order-controller.ts

export class OrderController {
    constructor(private placeOrder: PlaceOrderUseCase) {}

    async handlePlaceOrder(req: Request, res: Response): Promise<void> {
        try {
            const command = PlaceOrderCommandMapper.fromRequest(req.body);
            const order = await this.placeOrder.execute(command);
            res.status(201).json(OrderPresenter.toJSON(order));
        } catch (err) {
            this.handleError(err, res);
        }
    }

    private handleError(err: unknown, res: Response): void {
        if (err instanceof PaymentFailedError)
            res.status(402).json({ error: err.message });
        else if (err instanceof ValidationError)
            res.status(400).json({ error: err.message });
        else res.status(500).json({ error: "Internal server error" });
    }
}

// adapters/db/prisma-order-repository.ts
// implements the OrderRepository interface defined in the use case layer

export class PrismaOrderRepository implements OrderRepository {
    constructor(private prisma: PrismaClient) {}

    async save(order: Order): Promise<void> {
        await this.prisma.order.upsert({
            where: { id: order.id.value },
            create: OrderMapper.toPrisma(order),
            update: OrderMapper.toPrisma(order),
        });
    }
}
```

### 4. Frameworks & Drivers (Outermost)

The glue layer. Express config, Prisma setup, React root. Knows everything. Is known by nothing.

```typescript
// main.ts — the composition root — the ONLY place that instantiates concretions

const prisma = new PrismaClient();
const orderRepo = new PrismaOrderRepository(prisma);
const paymentGateway = new StripePaymentGateway(process.env.STRIPE_KEY);
const eventBus = new RabbitMQEventBus(process.env.RABBITMQ_URL);

const placeOrderUseCase = new PlaceOrderUseCase(
    orderRepo,
    paymentGateway,
    eventBus,
);
const orderController = new OrderController(placeOrderUseCase);

app.post("/api/orders", (req, res) =>
    orderController.handlePlaceOrder(req, res),
);
```

---

## Directory Structure

```
src/
├── domain/                    # Entities + domain events + value objects
│   ├── entities/
│   │   ├── order.ts
│   │   └── user.ts
│   ├── value-objects/
│   │   ├── money.ts
│   │   └── order-id.ts
│   └── events/
│       └── order-placed.event.ts
│
├── application/               # Use cases + ports (interfaces)
│   ├── use-cases/
│   │   └── place-order.use-case.ts
│   └── ports/                 # Interfaces that infrastructure must implement
│       ├── order.repository.ts
│       └── payment.gateway.ts
│
├── adapters/                  # Controllers, presenters, repository implementations
│   ├── http/
│   │   └── order.controller.ts
│   └── db/
│       └── prisma-order.repository.ts
│
└── infrastructure/            # Framework config, DI container, main.ts
    └── main.ts
```

---

## Clean Architecture Checklist

- [ ] Can the domain layer be tested without Express, Prisma, or any framework?
- [ ] Does the domain layer import ZERO external packages?
- [ ] Do interfaces (ports) live with the consumer (application layer), not the implementation?
- [ ] Is there ONE composition root that knows about all concretions?
- [ ] Could you replace Express with Fastify by only changing the adapters layer?
- [ ] Could you replace PostgreSQL with MongoDB by only changing the DB adapter?
