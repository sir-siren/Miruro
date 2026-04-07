---
name: separation-of-concerns
trigger: "separation of concerns, SoC, layers, mixing concerns, business logic in UI, coupling layers, architectural separation"
---

# Separation of Concerns (SoC)

> **"Separation of concerns is a design principle for separating a computer program into distinct
> sections, such that each section addresses a separate concern."**
> — Edsger W. Dijkstra (1974)

A "concern" is any coherent piece of functionality. SoC means each module handles exactly one
concern and those modules are composed — not entangled.

---

## Why SoC Matters

When concerns are mixed:

- **Testing is hard**: can't test business logic without a running database
- **Reuse is impossible**: logic embedded in UI can't be used in a CLI
- **Change is risky**: fixing a display bug might break business rules
- **Understanding is slow**: you must parse two domains simultaneously

---

## The Classic Layered Architecture

```
┌─────────────────────────────────┐
│          Presentation           │  UI, API handlers, CLI
│  (React components, Express     │  — knows about DTOs, user input
│   controllers, CLI commands)    │  — NEVER contains business rules
├─────────────────────────────────┤
│          Application            │  Use cases / services
│  (OrderService, AuthService)    │  — orchestrates domain objects
│                                 │  — knows about interfaces, not impls
├─────────────────────────────────┤
│            Domain               │  Business logic, entities, value objects
│  (Order, User, Money, Policy)   │  — pure TypeScript, zero framework deps
│                                 │  — the HEART of the application
├─────────────────────────────────┤
│        Infrastructure           │  DB, external APIs, file system
│  (MySQLRepo, SendGridService,   │  — implements domain interfaces
│   S3FileStorage)                │  — all the messy I/O lives here
└─────────────────────────────────┘
         ↑ Dependencies only point UP
```

---

## SoC Violations — Most Common Patterns

### Violation 1: Business Logic in the UI Layer

```typescript
// ❌ React component doing business logic
function CheckoutPage({ cart }: { cart: Cart }) {
  function handleCheckout() {
    // Business logic IN the component
    const subtotal = cart.items.reduce((s, i) => s + i.price * i.qty, 0)
    const discount = cart.items.length > 10 ? subtotal * 0.1 : 0
    const tax = (subtotal - discount) * 0.08
    const total = subtotal - discount + tax

    fetch('/api/orders', { method: 'POST', body: JSON.stringify({ ...cart, total }) })
  }

  return <button onClick={handleCheckout}>Buy</button>
}

// ✅ Component only handles display and interaction
function CheckoutPage({ cart }: { cart: Cart }) {
  const { total, discount, tax } = useCartSummary(cart)  // business logic in a hook/service
  const { placeOrder, isLoading } = useOrderActions()

  return (
    <div>
      <PriceSummary subtotal={cart.subtotal} discount={discount} tax={tax} total={total} />
      <button onClick={() => placeOrder(cart)} disabled={isLoading}>Buy</button>
    </div>
  )
}
```

### Violation 2: Infrastructure in the Domain

```typescript
// ❌ Domain entity knows about Prisma (infrastructure)
import { PrismaClient } from "@prisma/client";

class Order {
    private static prisma = new PrismaClient();

    async save(): Promise<void> {
        await Order.prisma.order.create({ data: this.toJSON() });
    }
}

// ✅ Domain entity is pure
class Order {
    constructor(
        readonly id: string,
        readonly items: OrderItem[],
        readonly customerId: string,
    ) {}

    calculateTotal(): Money {
        return this.items.reduce(
            (sum, item) => sum.add(item.total()),
            Money.zero(),
        );
    }
    confirm(): Order {
        return new Order(this.id, this.items, this.customerId, "confirmed");
    }
}

// Persistence is in the infrastructure layer
class PrismaOrderRepository implements OrderRepository {
    async save(order: Order): Promise<void> {
        await this.prisma.order.upsert({
            where: { id: order.id },
            create: order.toJSON(),
            update: order.toJSON(),
        });
    }
}
```

### Violation 3: Presentation Logic in API Controllers

```typescript
// ❌ Controller contains business logic
app.post("/api/orders", async (req, res) => {
    const { items, customerId } = req.body;

    // Business logic in controller — wrong layer
    let total = 0;
    for (const item of items) {
        if (item.qty <= 0)
            return res.status(400).json({ error: "Invalid quantity" });
        total += item.price * item.qty;
    }
    if (total < 10)
        return res.status(400).json({ error: "Minimum order is $0.10" });

    const order = await db.orders.create({ items, customerId, total });
    res.json(order);
});

// ✅ Controller handles HTTP concerns only; delegates business logic
app.post("/api/orders", async (req, res) => {
    try {
        const command = PlaceOrderCommand.fromRequest(req.body); // parse/validate input
        const order = await orderService.placeOrder(command); // business logic
        res.status(201).json(OrderDTO.fromDomain(order)); // format response
    } catch (err) {
        handleHttpError(err, res);
    }
});
```

---

## SoC in Frontend (React)

```typescript
// ✅ Separated concerns in React
// - Component: JSX, event wiring, display logic
// - Hook: state management, side effects, data fetching
// - Service: business logic, transformations
// - Type: data contracts

// service/cart-service.ts — pure business logic
export function calculateCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const discount = applyVolumeDiscount(subtotal, items.length)
  return { subtotal, discount, tax: (subtotal - discount) * TAX_RATE, total: subtotal - discount + tax }
}

// hooks/use-cart.ts — state + side effects
export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const totals = useMemo(() => calculateCartTotals(items), [items])
  const addItem = useCallback((item: CartItem) => setItems(prev => [...prev, item]), [])
  return { items, totals, addItem }
}

// components/CartSummary.tsx — display only
export function CartSummary({ totals }: { totals: CartTotals }) {
  return (
    <dl>
      <dt>Subtotal</dt><dd>{formatCents(totals.subtotal)}</dd>
      <dt>Discount</dt><dd>-{formatCents(totals.discount)}</dd>
      <dt>Tax</dt><dd>{formatCents(totals.tax)}</dd>
      <dt>Total</dt><dd>{formatCents(totals.total)}</dd>
    </dl>
  )
}
```

---

## SoC Checklist

- [ ] Can I unit test business logic without starting a web server or database?
- [ ] Can I reuse the same business logic from a CLI and an HTTP API?
- [ ] If I swap PostgreSQL for MongoDB, do I only change the infrastructure layer?
- [ ] If I swap React for Vue, do I only change the presentation layer?
- [ ] Does each layer only import from layers at the same level or below?

All "yes" → concerns are properly separated.
