---
name: law-of-demeter
trigger: "law of demeter, LoD, principle of least knowledge, train wreck, method chaining coupling, tell don't ask"
---

# Law of Demeter (LoD) — Principle of Least Knowledge

> **"Only talk to your immediate friends."**
> — Karl Liebherr (1987)

A method should only call methods on:

1. `this` — the object itself
2. Objects passed as parameters
3. Objects created within the method
4. Direct fields/properties of the object

It should NOT reach through objects to call methods on their internals ("train wrecks").

---

## Train Wrecks — Classic Violations

```typescript
// ❌ Train wreck — navigating through an object graph
const city = customer.getAddress().getCity().getName();
const postcode = order.getCustomer().getAddress().getPostcode().getValue();
const ceo = company
    .getDepartment("Engineering")
    .getManager()
    .getBoss()
    .getName();

// Problems:
// - Tight coupling to deep object structure
// - Change any intermediate step = this breaks
// - Violates encapsulation of all intermediate objects
// - Hard to test (need all objects in the chain)
```

---

## The Fix — Tell, Don't Ask

Instead of reaching into an object to get data and then acting on it,
**tell the object to do the work itself**:

```typescript
// ❌ Asking too much — reaching inside customer to get address to get city
function getShippingLabel(order: Order): string {
    const city = order.getCustomer().getAddress().getCity();
    const zip = order.getCustomer().getAddress().getZip();
    return `Ship to: ${city}, ${zip}`;
}

// ✅ Tell — let objects expose what callers need
class Address {
    constructor(
        private street: string,
        private city: string,
        private zip: string,
    ) {}

    // Expose a useful summary, not raw fields
    formatShipping(): string {
        return `${this.city}, ${this.zip}`;
    }
}

class Customer {
    constructor(
        private name: string,
        private address: Address,
    ) {}
    getShippingInfo(): string {
        return this.address.formatShipping();
    }
}

class Order {
    constructor(private customer: Customer) {}
    getShippingLabel(): string {
        return `Ship to: ${this.customer.getShippingInfo()}`;
    }
}

// Caller never touches Address directly
const label = order.getShippingLabel();
```

---

## LoD in Practice — TypeScript Examples

### Example: Order Discount Calculation

```typescript
// ❌ Controller digs into order to calculate
app.get("/order/:id/discount", async (req, res) => {
    const order = await repo.find(req.params.id);
    // Violates LoD — controller knows too much about Order's internals
    const total = order.items.reduce(
        (s, i) => s + i.product.price * i.quantity,
        0,
    );
    const discount = order.customer.loyaltyPoints > 1000 ? total * 0.1 : 0;
    res.json({ discount });
});

// ✅ Ask the order to calculate its own discount
class Order {
    calculateDiscount(): Money {
        if (this.customer.isLoyaltyEligible()) {
            return this.total().multiply(LOYALTY_DISCOUNT_RATE);
        }
        return Money.zero();
    }
}

app.get("/order/:id/discount", async (req, res) => {
    const order = await repo.find(req.params.id);
    res.json({ discount: order.calculateDiscount().toCents() });
});
```

### Example: Event/Notification System

```typescript
// ❌ Notification builder navigates too deep
function buildNotification(user: User): string {
    const name = user.profile.personalInfo.displayName;
    const plan = user.subscription.plan.features.displayName;
    return `Hello ${name}, your ${plan} plan is active.`;
}

// ✅ User provides what's needed
class User {
    get displayName(): string {
        return this.profile.personalInfo.displayName;
    }
    get planName(): string {
        return this.subscription.plan.features.displayName;
    }
}

function buildNotification(user: User): string {
    return `Hello ${user.displayName}, your ${user.planName} plan is active.`;
}
```

---

## Exception: Fluent Interfaces / Builder Chaining

Method chaining on the **same object** does NOT violate LoD:

```typescript
// ✅ This is NOT a LoD violation — chaining on the same builder object
const query = QueryBuilder.from("users")
    .where("isActive", true)
    .orderBy("createdAt", "desc")
    .limit(10)
    .build();

// ✅ Same with Lodash/array method chaining — transforming the same data
const result = users
    .filter((u) => u.isActive)
    .map((u) => u.email)
    .sort();
```

LoD is violated when you navigate **between different objects** in a chain. Fluent APIs that
return `this` are about transforming one object.

---

## The Coupling Cost Visualized

```
// ❌ High coupling — you're coupled to every class in the chain
a.b().c().d().e()
// depends on: A, B, C, D, E — 5 classes

// ✅ Low coupling — you're coupled only to A
a.doTheThing()
// depends on: A — 1 class
```

Every dot is a coupling. Keep it minimal.

---

## Demeter Checklist

- [ ] Are there method chains navigating through more than 2 objects?
- [ ] Does any class call methods on an object returned from another method call?
- [ ] Would a change to an intermediate object's structure break this code?
- [ ] Can the required operation be moved to an intermediate object to provide a cleaner interface?
- [ ] Does code that "asks" for data then manipulate it — could the manipulation be delegated?

All "no" → LoD is respected.
