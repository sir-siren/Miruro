---
name: cohesion-and-coupling
trigger: "cohesion, coupling, high cohesion, low coupling, tight coupling, module design, dependency management"
---

# Cohesion & Coupling — The Fundamental Quality Metrics

> **"Aim for high cohesion, low coupling."**
> — Every software engineering textbook ever

These two metrics are the primary indicators of module quality. Together they determine how easy
a codebase is to change, test, and understand.

---

## Cohesion — How Well a Module Holds Together

Cohesion measures how closely related the responsibilities within a single module are.

**High cohesion** = module elements all work toward a single, well-defined purpose.
**Low cohesion** = module is a grab-bag of unrelated functionality.

### Cohesion Spectrum (Best to Worst)

| Type                     | Description                                                    | Example                                                  |
| ------------------------ | -------------------------------------------------------------- | -------------------------------------------------------- |
| **Functional** (best)    | All parts work together for one well-defined function          | `PasswordHasher` — only hashes passwords                 |
| **Sequential**           | Output of one part is input of next                            | `DataPipeline` — each step feeds the next                |
| **Communicational**      | All parts operate on same data                                 | `UserProfileService` — all methods work on `UserProfile` |
| **Procedural**           | Parts must be executed in a particular order                   | Procedural setup scripts                                 |
| **Temporal**             | Parts executed at the same time (startup, shutdown)            | `AppInitializer`                                         |
| **Logical**              | Parts classified together by type but not functionally related | `StringUtils` — random string operations                 |
| **Coincidental** (worst) | Parts grouped arbitrarily                                      | `Helpers.ts` with 30 unrelated utilities                 |

```typescript
// ❌ Coincidental cohesion — unrelated things bundled together
class Utils {
  formatDate(date: Date): string { ... }
  hashPassword(pwd: string): string { ... }
  calculateTax(amount: number): number { ... }
  sendEmail(to: string, body: string): void { ... }
  parseCSV(raw: string): string[][] { ... }
}

// ✅ High functional cohesion — each class has one purpose
class DateFormatter     { format(date: Date, locale: string): string { ... } }
class PasswordHasher    { hash(password: string): Promise<string> { ... } }
class TaxCalculator     { calculate(amount: Money, rate: TaxRate): Money { ... } }
class EmailDispatcher   { dispatch(message: Email): Promise<void> { ... } }
class CSVParser         { parse(raw: string): string[][] { ... } }
```

---

## Coupling — How Dependent Modules Are on Each Other

Coupling measures how much one module knows about and depends on another.

**Low coupling** = modules are independent; changes in one don't ripple to others.
**High (tight) coupling** = changing one module forces changes in many others.

### Coupling Spectrum (Best to Worst)

| Type                | Description                                              | Example                                     |
| ------------------- | -------------------------------------------------------- | ------------------------------------------- |
| **Message** (best)  | Modules communicate only through well-defined interfaces | Dependency injection via interface          |
| **Data**            | Pass simple data structures, not whole objects           | Pass `userId: string`, not the whole `User` |
| **Stamp**           | Pass complex data structures; receiver uses parts        | Pass `User` but only use `.email`           |
| **Control**         | One module controls the flow of another via flags        | `processOrder(order, isBulkOrder: boolean)` |
| **External**        | Both depend on same external data format/protocol        | Two modules both parse the same JSON format |
| **Common**          | Both depend on shared global state                       | Global mutable config object                |
| **Content** (worst) | One module accesses/changes internal state of another    | Direct field access: `order._total = 0`     |

---

## Measuring Coupling — Concrete Metrics

### Afferent Coupling (Ca) — Incoming Dependencies

How many other modules depend on this one?

- **High Ca** = this module is widely used (changing it is risky)
- High Ca modules must be **especially stable**

### Efferent Coupling (Ce) — Outgoing Dependencies

How many other modules does this one depend on?

- **High Ce** = this module has many responsibilities / is fragile

### Instability (I) = Ce / (Ca + Ce)

- I = 0 → Maximally stable (everything depends on it, it depends on nothing)
- I = 1 → Maximally unstable (depends on everything, nothing depends on it)

**Stable Dependency Principle**: depend on modules that are more stable than you.

---

## Practical Coupling Reduction Techniques

### 1. Depend on Interfaces, Not Concretions (DIP)

```typescript
// ❌ Tight coupling to concrete class
class OrderService {
    private repo = new MySQLOrderRepository(); // coupled to MySQL
}

// ✅ Loose coupling via interface
class OrderService {
    constructor(private repo: OrderRepository) {} // coupled to interface only
}
```

### 2. Reduce Parameter Surface

```typescript
// ❌ Forces caller to construct whole User just to get an email
function sendWelcome(user: User): void {
    mailer.send(user.email, "Welcome!");
}

// ✅ Only coupled to what it needs
function sendWelcome(email: string): void {
    mailer.send(email, "Welcome!");
}
```

### 3. Event-Driven Decoupling

```typescript
// ❌ OrderService is coupled to 4 downstream services
class OrderService {
    constructor(
        private inventory: InventoryService, // coupled
        private billing: BillingService, // coupled
        private shipping: ShippingService, // coupled
        private analytics: AnalyticsService, // coupled
    ) {}

    async placeOrder(order: Order): Promise<void> {
        order.confirm();
        await this.inventory.reserve(order);
        await this.billing.charge(order);
        await this.shipping.schedule(order);
        await this.analytics.track(order);
    }
}

// ✅ OrderService only knows about EventBus — downstream services subscribe
class OrderService {
    constructor(private events: EventBus) {}

    async placeOrder(order: Order): Promise<void> {
        order.confirm();
        await this.events.publish(new OrderPlacedEvent(order));
    }
}

// Each downstream service subscribes independently
inventoryService.listenFor(OrderPlacedEvent);
billingService.listenFor(OrderPlacedEvent);
shippingService.listenFor(OrderPlacedEvent);
analyticsService.listenFor(OrderPlacedEvent);
```

---

## The Cohesion-Coupling Matrix

|                   | High Cohesion                           | Low Cohesion                      |
| ----------------- | --------------------------------------- | --------------------------------- |
| **Low Coupling**  | ✅ Ideal — independent, focused modules | ⚠️ Independent but unfocused      |
| **High Coupling** | ⚠️ Focused but entangled                | ❌ Worst — spaghetti architecture |

---

## Cohesion & Coupling Checklist

- [ ] Can each class be described in one sentence without "and"?
- [ ] Do the methods in each class mostly use the same instance variables?
- [ ] Can you change one module without touching more than 1-2 others?
- [ ] Are dependencies expressed via interfaces, not concrete classes?
- [ ] Is there a clear data flow direction — no circular dependencies?
- [ ] Is shared mutable state eliminated or isolated?
