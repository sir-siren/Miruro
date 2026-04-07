---
name: anti-patterns-catalog
trigger: "anti-patterns, god object, spaghetti code, golden hammer, lava flow, copy paste programming, anti pattern list"
---

# Anti-Patterns Catalog

> **"An anti-pattern is a common response to a recurring problem that is usually ineffective
> and risks being highly counterproductive."**
> — Andrew Koenig (1995)

Anti-patterns are the dark mirror of design patterns: they are named for common mistakes so we
can recognize and name them quickly.

---

## Software Development Anti-Patterns

### God Object (God Class)

**Description:** One class that knows too much and does too much — the center of the universe.
**Symptoms:** 1000+ line class, imports from every module, methods touching every domain concept.
**Fix:** Decompose using SRP. Extract Class. Identify natural cohesion groups.

```typescript
// ❌ God class — knows about users, orders, payments, emails, and PDF generation
class ApplicationManager {
    createUser() {}
    deleteUser() {}
    placeOrder() {}
    cancelOrder() {}
    chargePayment() {}
    refundPayment() {}
    sendEmail() {}
    generateInvoicePDF() {}
    // ... 200 more methods
}
```

---

### Spaghetti Code

**Description:** Code with tangled control flow, no structure, functions calling each other
in unpredictable directions, deep nesting, globals everywhere.
**Fix:** Identify layers. Extract functions. Introduce domain objects. Apply SoC.

---

### Copy-Paste Programming

**Description:** Duplicating code instead of abstracting it. Each copy becomes independently
wrong when requirements change.
**Fix:** DRY — Extract the common logic into a named function/class.

---

### Golden Hammer

**Description:** "If all you have is a hammer, everything looks like a nail." Applying a
familiar technology or pattern to every problem regardless of fit.
**Example:** Using Redis for everything including complex relational queries.
**Fix:** Choose tools for the problem. Evaluate trade-offs per use case.

---

### Lava Flow (Dead Code)

**Description:** Hardened legacy code that nobody understands, nobody dares to delete, and
everyone works around.
**Fix:** Identify with coverage tools. Delete incrementally. Use feature flags for gradual removal.

---

### Magic Numbers / Magic Strings

```typescript
// ❌ What is 86400? What does 'TIER_2' mean?
if (user.age > 18 && subscription !== "TIER_2") {
    setTimeout(callback, 86400);
}

// ✅ Named constants reveal intent
const LEGAL_AGE = 18;
const PREMIUM_TIER = "TIER_2";
const ONE_DAY_MS = 24 * 60 * 60 * 1_000;

if (user.age > LEGAL_AGE && subscription !== PREMIUM_TIER) {
    setTimeout(callback, ONE_DAY_MS);
}
```

---

### Premature Optimization

**Description:** Optimizing before you know there is a performance problem. Sacrifices
readability for imagined speed gains.
**"Premature optimization is the root of all evil."** — Donald Knuth
**Fix:** Write clear code first. Profile. Optimize only proven bottlenecks.

```typescript
// ❌ Bitwise trick to avoid "slow" modulo operation — unreadable, rarely faster in JS/TS
const isEven = (n & 1) === 0;

// ✅ Clear, readable — let the engine optimize
const isEven = n % 2 === 0;
```

---

### Shotgun Surgery

**Description:** A single conceptual change requires modifications to many different classes.
**Fix:** Move Method / Move Field — consolidate related logic. Apply SRP to group what changes together.

---

### Anemic Domain Model

**Description:** Domain objects are just data bags with getters/setters. All logic lives in
service classes that manipulate them. The domain model has no behavior.
**Fix:** Move behavior into domain objects where the data lives (Rich Domain Model).

```typescript
// ❌ Anemic — Order is just a data container
class Order {
  status: string
  items: OrderItem[]
  total: number
}

// OrderService does all the work — "Feature Envy"
class OrderService {
  confirm(order: Order): void {
    if (order.items.length === 0) throw new Error(...)
    order.status = 'confirmed'
    order.total = order.items.reduce(...)
  }
}

// ✅ Rich domain model — behavior lives where the data lives
class Order {
  confirm(): void {
    if (this._items.length === 0) throw new EmptyOrderError()
    this._status = 'confirmed'
  }

  total(): Money { return this._items.reduce((sum, i) => sum.add(i.subtotal()), Money.zero()) }
}
```

---

### Boat Anchor (Dead Code as a "Just in Case")

**Description:** Retaining unused code because "we might need it later."
**Fix:** YAGNI — delete it. Git history preserves it if you ever need it.

---

### Object Orgy (Inappropriate Intimacy)

**Description:** Classes that poke into each other's private members, accessing internal state
directly rather than through public interfaces.
**Fix:** Encapsulate. Law of Demeter. Move behavior to where data lives.

```typescript
// ❌ Directly manipulating another class's internals
class OrderProcessor {
    process(order: Order): void {
        order._status = "processing"; // accessing private field!
        order._items.forEach((i) => {
            i._reserved = true;
        }); // breaking encapsulation
    }
}

// ✅ Use public interface
class OrderProcessor {
    process(order: Order): void {
        order.startProcessing(); // Order controls its own state
    }
}
```

---

### Callback Hell (Pyramid of Doom)

**Description:** Deeply nested callbacks, each level deeper and more unreadable.
**Fix:** Promises → `async/await`. Extract functions. Use functional composition.

```typescript
// ❌ Callback hell
getUser(id, (user) => {
    getOrders(user.id, (orders) => {
        getPayments(orders[0].id, (payments) => {
            sendEmail(user.email, payments, (result) => {
                if (result.error) {
                    log(result.error, () => {
                        /* even deeper */
                    });
                }
            });
        });
    });
});

// ✅ async/await
const user = await getUser(id);
const orders = await getOrders(user.id);
const payments = await getPayments(orders[0].id);
await sendEmail(user.email, payments);
```

---

### Silver Bullet Thinking

**Description:** Believing one technology, architecture, or methodology solves all problems.
**Fix:** Learn trade-offs. Match the tool to the problem. Avoid cargo cult engineering.

---

### Big Ball of Mud

**Description:** No structure, no layers, no design — everything talks to everything.
The most common real-world architecture by accident.
**Fix:** Identify natural boundaries. Introduce layers incrementally. Don't try to fix everything at once.

---

## Anti-Pattern Quick Reference

| Anti-Pattern           | Keyword                              | Fix                  |
| ---------------------- | ------------------------------------ | -------------------- |
| God Object             | "does everything"                    | SRP, Extract Class   |
| Spaghetti              | "tangled flow"                       | Layers, SoC          |
| Copy-Paste             | "duplicated code"                    | DRY, Extract         |
| Golden Hammer          | "use X for everything"               | Evaluate trade-offs  |
| Lava Flow              | "dead code nobody removes"           | Delete with coverage |
| Premature Optimization | "it might be slow"                   | Profile first        |
| Anemic Domain          | "logic in services, data in classes" | Rich Domain Model    |
| Callback Hell          | "nested callbacks"                   | async/await          |
| Boat Anchor            | "YAGNI violation"                    | Delete it            |
