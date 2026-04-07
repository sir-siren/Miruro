---
name: code-smells
trigger: "code smell, bad code, refactor smell, long method, duplicate code, smell detection, code rot"
---

# Code Smells — Detection & Remediation

> **"A code smell is a surface indication that usually corresponds to a deeper problem."**
> — Martin Fowler, _Refactoring_

Code smells are not bugs. They don't prevent the code from working. They are symptoms of design
problems that will compound over time. Recognize them early; refactor proactively.

---

## Smell Categories

### Category 1: Bloaters (Things That Got Too Big)

#### Long Method

**Smell:** A function over 20 lines trying to do multiple things.
**Fix:** Extract Method — pull logical sub-steps into named functions.

```typescript
// ❌ Long method
async function handleCheckout(cart: Cart, user: User): Promise<Order> {
    // 80 lines of interleaved logic
}

// ✅ Extracted
async function handleCheckout(cart: Cart, user: User): Promise<Order> {
    const validatedCart = await validateCart(cart);
    const pricedCart = applyDiscounts(validatedCart, user);
    const payment = await processPayment(pricedCart, user.paymentMethod);
    return createOrder(pricedCart, payment, user);
}
```

#### Large Class (God Class)

**Smell:** A class with 500+ lines and dozens of unrelated methods.
**Fix:** Extract Class — separate responsibilities into focused classes.

#### Long Parameter List

**Smell:** Function with 4+ parameters.
**Fix:** Introduce Parameter Object or Query Object.

```typescript
// ❌
function createReport(
    title: string,
    from: Date,
    to: Date,
    format: string,
    includeChart: boolean,
) {}

// ✅
interface ReportOptions {
    title: string;
    dateRange: { from: Date; to: Date };
    format: "pdf" | "csv" | "html";
    includeChart?: boolean;
}

function createReport(options: ReportOptions): Report {}
```

#### Data Clumps

**Smell:** The same 3-4 variables always appear together. City + State + Zip always travel as a pack.
**Fix:** Extract them into a value object.

```typescript
// ❌ city/state/zip appear in 7 functions
// ✅
class Address {
    constructor(
        readonly street: string,
        readonly city: string,
        readonly state: string,
        readonly zip: string,
    ) {}

    toString(): string {
        return `${this.street}, ${this.city}, ${this.state} ${this.zip}`;
    }
}
```

---

### Category 2: Object-Orientation Abusers

#### Switch Statements / Long If-Else Chains

**Smell:** Repeated type-switching dispatching on the same discriminant.
**Fix:** Replace with polymorphism (Strategy/Command pattern).

```typescript
// ❌ Every new payment type = editing this switch
function calculateFee(payment: Payment): number {
    switch (payment.type) {
        case "credit":
            return payment.amount * 0.029;
        case "debit":
            return payment.amount * 0.015;
        case "crypto":
            return payment.amount * 0.01;
    }
}

// ✅ Each type encapsulates its own fee calculation
interface PaymentMethod {
    calculateFee(amount: number): number;
}
class CreditPayment implements PaymentMethod {
    calculateFee(amount: number) {
        return amount * 0.029;
    }
}
class DebitPayment implements PaymentMethod {
    calculateFee(amount: number) {
        return amount * 0.015;
    }
}
class CryptoPayment implements PaymentMethod {
    calculateFee(amount: number) {
        return amount * 0.01;
    }
}
```

#### Refused Bequest

**Smell:** A subclass inherits from a parent but doesn't use (or throws on) most inherited methods.
**Fix:** Replace Inheritance with Delegation; or restructure the hierarchy.

#### Temporary Field

**Smell:** An instance variable that's only set in one method and only used in another — `null` the rest of the time.
**Fix:** Extract a parameter object or move the logic to where the data lives.

---

### Category 3: Change Preventers (Changeability Smells)

#### Divergent Change

**Smell:** One class is changed for different reasons at different times (two change drivers).
**Fix:** SRP — split the class.

#### Shotgun Surgery

**Smell:** One logical change requires modifying many different classes.
**Fix:** Move Method / Move Field — concentrate related changes.

#### Parallel Inheritance Hierarchies

**Smell:** Every time you add a subclass to hierarchy A, you must add one to hierarchy B.
**Fix:** Collapse hierarchies using delegation.

---

### Category 4: Dispensables (Things That Shouldn't Exist)

#### Duplicate Code (DRY Violation)

**Smell:** Identical or near-identical code in 2+ places.
**Fix:** Extract Method / Extract Class / Pull Up Method.

```typescript
// ❌ Validation duplicated in 3 controllers
if (!email || !email.includes("@")) throw new Error("Invalid email");

// ✅ Centralized
function assertValidEmail(email: string): void {
    if (!email?.includes("@"))
        throw new ValidationError("email", "must be a valid email");
}
```

#### Dead Code

**Smell:** Functions, variables, or branches that are never reached or called.
**Fix:** Delete it. That's what git history is for.

#### Speculative Generality

**Smell:** Abstract hooks, unused parameters, extra classes "just in case we need them later."
**Fix:** YAGNI — delete the abstraction until it's actually needed.

#### Data Class

**Smell:** A class that only has fields and getters/setters, no behavior. Pure data container that other classes manipulate.
**Fix:** Move the behavior that manipulates the data INTO the class.

---

### Category 5: Couplers (Dependency Smells)

#### Feature Envy

**Smell:** A method that uses another class's data more than its own. It "envies" the other class.
**Fix:** Move Method — relocate the method to the class it's most interested in.

```typescript
// ❌ OrderPrinter uses Order data extensively — envies Order
class OrderPrinter {
    print(order: Order): string {
        const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
        const tax = subtotal * order.taxRate;
        return `${order.customerName}: ${subtotal + tax}`;
    }
}

// ✅ Move behavior to where the data lives
class Order {
    calculateTotal(): number {
        return this.subtotal() + this.tax();
    }
    private subtotal(): number {
        return this.items.reduce((s, i) => s + i.price * i.qty, 0);
    }
    private tax(): number {
        return this.subtotal() * this.taxRate;
    }
    format(): string {
        return `${this.customerName}: ${this.calculateTotal()}`;
    }
}
```

#### Inappropriate Intimacy

**Smell:** Two classes that dig into each other's private parts, accessing internal state.
**Fix:** Move Method/Field, or introduce a mediating class.

#### Law of Demeter Violations (Message Chains)

**Smell:** `user.getAddress().getCity().getPostalCode()` — "train wrecks."
**Fix:** Add a delegating method (`user.getPostalCode()`) or restructure.

#### Middle Man

**Smell:** A class that does nothing except forward calls to another class. 90% of methods are delegations.
**Fix:** Remove Middle Man — call the delegate directly, or inline the forwarding class.

---

## Code Smell Quick-Reference Card

| Smell                | Symptom                                | Refactoring                  |
| -------------------- | -------------------------------------- | ---------------------------- |
| Long Method          | > 20 lines                             | Extract Method               |
| Large Class          | > 300 lines, many responsibilities     | Extract Class                |
| Long Parameter List  | > 3 args                               | Introduce Parameter Object   |
| Duplicate Code       | Copy-paste                             | Extract Function / DRY       |
| Dead Code            | Unreachable branch                     | Delete                       |
| Feature Envy         | Uses other class's data                | Move Method                  |
| Data Clumps          | Same vars always together              | Extract Class / Value Object |
| Switch Statement     | Type-dispatch chain                    | Polymorphism / Strategy      |
| Primitive Obsession  | Raw strings for domain concepts        | Value Objects                |
| Comments on bad code | Comment explains what code should have | Rename / Extract             |
