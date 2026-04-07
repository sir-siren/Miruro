---
name: immutability-and-pure-functions
trigger: "immutability, pure functions, side effects, functional programming, value objects, mutable state bugs"
---

# Immutability & Pure Functions

> **"Mutable state is the root of all evil in software."**
> — Paraphrasing Tony Hoare's "null" regret; widely attributed to functional programming advocates

Mutable shared state is the #1 source of bugs that are hard to reproduce and hard to reason about.
Immutability eliminates entire categories of bugs.

---

## Pure Functions

A pure function:

1. **Returns the same output for the same input — always** (deterministic)
2. **Has no side effects** — doesn't modify external state, doesn't do I/O

```typescript
// ❌ Impure — depends on and modifies external state
let total = 0;
function addToTotal(amount: number): void {
    total += amount; // side effect: modifies external variable
}

// ❌ Impure — same input can produce different output
function getCurrentAge(birthYear: number): number {
    return new Date().getFullYear() - birthYear; // depends on current time
}

// ✅ Pure — same input always produces same output, no side effects
function calculateAge(birthYear: number, currentYear: number): number {
    return currentYear - birthYear;
}

// ✅ Pure — transformations without mutation
function addDiscount(price: number, discountRate: number): number {
    return price * (1 - discountRate);
}
```

---

## Immutable Data Structures

### Never Mutate — Always Transform

```typescript
// ❌ Mutation — hard to track changes, breaks referential equality
function addItem(cart: Cart, item: CartItem): void {
    cart.items.push(item); // mutates the original
    cart.total += item.price;
}

// ✅ Transformation — return new value, leave original intact
function addItem(cart: Cart, item: CartItem): Cart {
    return {
        ...cart,
        items: [...cart.items, item],
        total: cart.total + item.price,
    };
}
```

### TypeScript Immutability Helpers

```typescript
// 1. readonly properties — prevents mutation at compile time
interface Point {
    readonly x: number;
    readonly y: number;
}

// 2. Readonly<T> — makes all properties readonly
type ImmutableUser = Readonly<User>;

// 3. ReadonlyArray<T> — prevents array mutation
function processItems(items: ReadonlyArray<CartItem>): number {
    return items.reduce((sum, item) => sum + item.price, 0);
    // items.push(...)  ← compile error
}

// 4. as const — deep readonly for literals
const CONFIG = {
    maxRetries: 3,
    timeoutMs: 5_000,
    endpoints: ["https://api-1.example.com", "https://api-2.example.com"],
} as const;
// CONFIG.maxRetries = 4  ← compile error

// 5. Immutable class using private constructor + factory methods
class Money {
    private constructor(
        readonly amount: number,
        readonly currency: string,
    ) {}

    static of(amount: number, currency: string): Money {
        if (amount < 0) throw new Error("Money cannot be negative");
        return new Money(amount, currency);
    }

    // Returns a NEW Money — never mutates this
    add(other: Money): Money {
        if (other.currency !== this.currency)
            throw new Error("Currency mismatch");
        return new Money(this.amount + other.amount, this.currency);
    }

    multiply(factor: number): Money {
        return new Money(Math.round(this.amount * factor), this.currency);
    }
}

const price = Money.of(1000, "USD");
const tax = price.multiply(0.08);
const total = price.add(tax);
// price is unchanged — all operations return new instances
```

---

## Immutable Domain Entities

```typescript
// ❌ Mutable entity — state changes are hard to track
class Order {
    status: string = "pending";
    items: OrderItem[] = [];

    confirm(): void {
        this.status = "confirmed";
    }
    addItem(item: OrderItem): void {
        this.items.push(item);
    }
}

// ✅ Immutable entity — state transitions return new instances
class Order {
    constructor(
        readonly id: string,
        readonly status: OrderStatus,
        readonly items: ReadonlyArray<OrderItem>,
        readonly customerId: string,
    ) {}

    confirm(): Order {
        if (this.status !== "pending")
            throw new InvalidTransitionError(this.status, "confirmed");
        return new Order(this.id, "confirmed", this.items, this.customerId);
    }

    addItem(item: OrderItem): Order {
        if (this.status !== "pending")
            throw new Error("Cannot modify a confirmed order");
        return new Order(
            this.id,
            this.status,
            [...this.items, item],
            this.customerId,
        );
    }
}

// State transitions are tracked — each line is a recorded event
const draft = new Order("ord-1", "pending", [], "cust-1");
const withItem = draft.addItem(
    new OrderItem("prod-1", 2, Money.of(500, "USD")),
);
const confirmed = withItem.confirm();
```

---

## Array Operations — Pure vs Mutating

| Mutating ❌        | Pure ✅                                  |
| ------------------ | ---------------------------------------- |
| `arr.push(x)`      | `[...arr, x]`                            |
| `arr.pop()`        | `arr.slice(0, -1)`                       |
| `arr.splice(i, 1)` | `arr.filter((_, idx) => idx !== i)`      |
| `arr.sort()`       | `[...arr].sort()`                        |
| `arr.reverse()`    | `[...arr].reverse()`                     |
| `arr[i] = x`       | `arr.map((v, idx) => idx === i ? x : v)` |

---

## Benefits of Immutability

| Benefit                      | Why                                                                    |
| ---------------------------- | ---------------------------------------------------------------------- |
| **No race conditions**       | Two threads can't corrupt shared state if state is never mutated       |
| **Easy debugging**           | Values don't change unexpectedly — stack traces are meaningful         |
| **Referential transparency** | Same input = same output, always. Functions are predictable.           |
| **Free undo/redo**           | Keep old versions of state — never overwrite                           |
| **React compatibility**      | Immutable updates make React's shallow equality diffing work correctly |
| **Testability**              | Pure functions need no setup/teardown — just call with inputs          |

---

## When Mutation is Acceptable

Immutability is a principle, not a dogma. Mutation is acceptable when:

- **Local to a function** — mutable variable created and discarded within one function call
- **Performance-critical** — allocating new objects in tight loops (use benchmarks to justify)
- **Managing external resources** — file handles, network sockets, DB connections

```typescript
// Local mutation is fine — doesn't escape the function
function buildQueryString(params: Record<string, string>): string {
    const parts: string[] = []; // mutable local accumulator
    for (const [key, value] of Object.entries(params)) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    return parts.join("&");
}
```
