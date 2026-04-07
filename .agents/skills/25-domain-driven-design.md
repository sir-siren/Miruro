---
name: domain-driven-design-core
trigger: "DDD, domain driven design, entities, value objects, aggregates, ubiquitous language, bounded context, domain model"
---

# Domain-Driven Design (DDD) — Core Concepts

> **"The heart of software is its ability to solve domain-related problems for its users."**
> — Eric Evans, _Domain-Driven Design_ (2003)

DDD is an approach where the software model closely reflects the business domain. The code uses the
same language as the business, and the design is driven by domain complexity — not technical
complexity.

---

## Ubiquitous Language

The single most important DDD concept. Use the **same vocabulary** in code, conversations, tests,
and documentation as the domain experts use.

```typescript
// ❌ Technical vocabulary — disconnected from business
class DataRecord {
  processEntry(payload: Record<string, unknown>): void { ... }
  updateRow(id: string, delta: Partial<unknown>): void { ... }
}

// ✅ Domain vocabulary — code reads like the business talks
class Invoice {
  issue(issuedTo: Customer): IssuedInvoice { ... }
  markAsPaid(payment: Payment): PaidInvoice { ... }
  void(reason: VoidReason): VoidedInvoice { ... }
}
```

---

## Building Blocks

### Entities — Identity Matters

An entity has a **unique identity** that persists through its entire lifecycle. Two users with the
same name are still different users because their IDs differ.

```typescript
class User {
    constructor(
        private readonly _id: UserId, // identity is stable and unique
        private _email: Email,
        private _name: PersonName,
    ) {}

    get id(): UserId {
        return this._id;
    }

    changeEmail(newEmail: Email): void {
        if (this._email.equals(newEmail)) return;
        this._email = newEmail;
        this.record(new UserEmailChangedEvent(this._id, newEmail));
    }

    // Identity equality — two users are equal if their IDs match
    equals(other: User): boolean {
        return this._id.equals(other._id);
    }
}
```

### Value Objects — Value Matters, Identity Doesn't

A value object has **no identity**. Two `Money(100, 'USD')` instances are interchangeable.
Value objects are **immutable**.

```typescript
class Money {
    private constructor(
        private readonly _amount: number,
        private readonly _currency: Currency,
    ) {}

    static of(amount: number, currency: Currency): Money {
        if (amount < 0) throw new NegativeAmountError();
        return new Money(amount, currency);
    }

    static zero(currency: Currency = Currency.USD): Money {
        return new Money(0, currency);
    }

    add(other: Money): Money {
        this.assertSameCurrency(other);
        return new Money(this._amount + other._amount, this._currency);
    }

    isGreaterThan(other: Money): boolean {
        this.assertSameCurrency(other);
        return this._amount > other._amount;
    }

    // Value equality — content matters, not reference
    equals(other: Money): boolean {
        return (
            this._amount === other._amount && this._currency === other._currency
        );
    }

    private assertSameCurrency(other: Money): void {
        if (!this._currency.equals(other._currency))
            throw new CurrencyMismatchError(this._currency, other._currency);
    }
}
```

### Aggregates — Consistency Boundary

An aggregate is a cluster of domain objects treated as a single unit for data changes.
The **Aggregate Root** is the only entry point — external objects may only hold a reference to the root.

```typescript
// Order is the Aggregate Root — controls access to OrderItems
class Order {
    private _items: OrderItem[] = [];
    private _status: OrderStatus = OrderStatus.Draft;

    constructor(
        readonly id: OrderId,
        readonly customerId: CustomerId,
    ) {}

    // All mutations go through the aggregate root
    addItem(productId: ProductId, qty: Quantity, price: Money): void {
        if (this._status !== OrderStatus.Draft)
            throw new OrderNotModifiableError(this.id);

        const existing = this._items.find((i) => i.productId.equals(productId));
        if (existing) {
            existing.increaseQty(qty);
        } else {
            this._items.push(new OrderItem(productId, qty, price));
        }
    }

    place(): void {
        if (this._items.length === 0) throw new EmptyOrderError();
        this._status = OrderStatus.Placed;
        this.record(new OrderPlacedEvent(this.id, this._items, this.total()));
    }

    total(): Money {
        return this._items.reduce(
            (sum, item) => sum.add(item.subtotal()),
            Money.zero(),
        );
    }

    get items(): ReadonlyArray<OrderItem> {
        return [...this._items];
    }
}

// OrderItem lives INSIDE the Order aggregate — never accessed directly by outside objects
class OrderItem {
    constructor(
        readonly productId: ProductId,
        private _qty: Quantity,
        readonly unitPrice: Money,
    ) {}

    increaseQty(additional: Quantity): void {
        this._qty = this._qty.add(additional);
    }
    subtotal(): Money {
        return this.unitPrice.multiply(this._qty.value);
    }
}
```

### Domain Services

When a domain operation doesn't naturally fit in an entity or value object, put it in a Domain Service:

```typescript
// PricingService — belongs to domain but doesn't fit in a single entity
class PricingService {
    calculateOrderPrice(
        order: Order,
        customer: Customer,
        promotions: Promotion[],
    ): Money {
        const basePrice = order.total();
        const applicablePromos = promotions.filter((p) =>
            p.appliesTo(order, customer),
        );
        return applicablePromos.reduce(
            (price, promo) => promo.apply(price),
            basePrice,
        );
    }
}
```

---

## Bounded Contexts

A bounded context defines the boundaries within which a particular domain model is valid and
consistent. The same concept can have different meanings in different contexts:

```
┌─────────────────────────┐    ┌─────────────────────────┐
│    Sales Context         │    │   Shipping Context       │
│                          │    │                          │
│  Customer {              │    │  Customer {              │
│    id, name, email,      │    │    id, shippingAddress,  │
│    loyaltyPoints,        │    │    preferredCarrier,     │
│    purchaseHistory       │    │    deliveryInstructions  │
│  }                       │    │  }                       │
└─────────────────────────┘    └─────────────────────────┘
      Same "Customer" concept — different models per context
```

---

## Repository Pattern in DDD

Repositories abstract the persistence of aggregates — domain code never knows about SQL:

```typescript
// Port — defined in the domain layer
interface OrderRepository {
    save(order: Order): Promise<void>;
    findById(id: OrderId): Promise<Order | null>;
    findByCustomer(customerId: CustomerId): Promise<Order[]>;
    nextId(): OrderId;
}

// Adapter — lives in the infrastructure layer
class PostgresOrderRepository implements OrderRepository {
    async save(order: Order): Promise<void> {
        await this.db.transaction(async (tx) => {
            await tx.orders.upsert({
                where: { id: order.id.value },
                data: this.toRow(order),
            });
            await tx.orderItems.deleteMany({
                where: { orderId: order.id.value },
            });
            await tx.orderItems.createMany({
                data: order.items.map(this.itemToRow),
            });
        });
    }

    async findById(id: OrderId): Promise<Order | null> {
        const row = await this.db.orders.findUnique({
            where: { id: id.value },
            include: { items: true },
        });
        return row ? this.toDomain(row) : null;
    }
}
```

---

## DDD When to Apply

DDD is most valuable when:

- The domain is **complex** with intricate business rules
- There are **domain experts** who can collaborate on the model
- The software will **evolve** over years

DDD is overkill for:

- CRUD apps with simple data access
- Batch jobs and ETL pipelines
- Simple REST proxies
