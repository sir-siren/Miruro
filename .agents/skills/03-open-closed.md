---
name: open-closed-principle
trigger: "OCP, open closed, adding features without modifying existing code, extension points, strategy pattern"
---

# Open/Closed Principle (OCP)

> **"Software entities should be open for extension, but closed for modification."**
> — Bertrand Meyer (popularized by Robert C. Martin)

Once a class is written and tested, you should be able to **add new behavior** without editing it.
New requirements are met by writing new code, not patching old code. This prevents regressions in
battle-tested logic.

---

## The Core Insight

Every time you modify existing code:

- You risk breaking existing behavior
- You need to re-test everything downstream
- You accumulate risk with each change

OCP says: **design extension points upfront** so future changes are additive, not mutative.

---

## Classic Violation — The `if/switch` Smell

```typescript
// ❌ Violates OCP — every new shape requires modifying AreaCalculator
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "rectangle"; width: number; height: number };

class AreaCalculator {
    calculate(shape: Shape): number {
        if (shape.kind === "circle") {
            return Math.PI * shape.radius ** 2;
        }
        if (shape.kind === "rectangle") {
            return shape.width * shape.height;
        }
        // Adding a triangle means editing THIS file — OCP violation
        throw new Error("Unknown shape");
    }
}
```

```typescript
// ✅ OCP compliant — new shapes extend without touching AreaCalculator
interface Shape {
    area(): number;
}

class Circle implements Shape {
    constructor(private radius: number) {}
    area(): number {
        return Math.PI * this.radius ** 2;
    }
}

class Rectangle implements Shape {
    constructor(
        private width: number,
        private height: number,
    ) {}
    area(): number {
        return this.width * this.height;
    }
}

// Adding Triangle requires ZERO changes to existing classes
class Triangle implements Shape {
    constructor(
        private base: number,
        private height: number,
    ) {}
    area(): number {
        return 0.5 * this.base * this.height;
    }
}

class AreaCalculator {
    calculate(shape: Shape): number {
        return shape.area();
    } // never changes
}
```

---

## Key Patterns That Enable OCP

### 1. Strategy Pattern

Inject behavior as a dependency:

```typescript
interface SortStrategy<T> {
    sort(items: T[]): T[];
}

class BubbleSortStrategy<T> implements SortStrategy<T> {
    sort(items: T[]): T[] {
        /* bubble sort impl */ return items;
    }
}

class QuickSortStrategy<T> implements SortStrategy<T> {
    sort(items: T[]): T[] {
        /* quicksort impl */ return items;
    }
}

class DataProcessor<T> {
    constructor(private sorter: SortStrategy<T>) {}

    process(items: T[]): T[] {
        return this.sorter.sort(items); // swap strategies without changing DataProcessor
    }
}
```

### 2. Plugin / Handler Registration

```typescript
type DiscountHandler = (order: Order) => number;

class DiscountEngine {
    private handlers: DiscountHandler[] = [];

    register(handler: DiscountHandler): void {
        this.handlers.push(handler);
    }

    apply(order: Order): number {
        return this.handlers.reduce(
            (total, handler) => total + handler(order),
            0,
        );
    }
}

// Adding a new discount type = registering a new handler, not editing DiscountEngine
const engine = new DiscountEngine();
engine.register((order) => (order.isFirstPurchase ? 10 : 0));
engine.register((order) => (order.totalItems > 5 ? 5 : 0));
engine.register((order) => (order.couponCode === "SAVE20" ? 20 : 0));
```

### 3. Template Method Pattern

Fix the skeleton, vary the steps:

```typescript
abstract class DataExporter {
    // Template method — closed for modification
    export(data: unknown[]): string {
        const formatted = this.format(data);
        const header = this.buildHeader();
        return `${header}\n${formatted}`;
    }

    // Extension points — open for extension
    protected abstract format(data: unknown[]): string;
    protected abstract buildHeader(): string;
}

class CSVExporter extends DataExporter {
    protected format(data: unknown[]): string {
        return data.map((r) => Object.values(r as object).join(",")).join("\n");
    }
    protected buildHeader(): string {
        return "CSV Export";
    }
}

class JSONExporter extends DataExporter {
    protected format(data: unknown[]): string {
        return JSON.stringify(data, null, 2);
    }
    protected buildHeader(): string {
        return "// JSON Export";
    }
}
```

---

## OCP at the Module Level

OCP applies beyond classes — to modules and services too:

```typescript
// ❌ Notification module that must be modified for each new channel
function sendNotification(type: "email" | "sms" | "push", message: string) {
    if (type === "email") {
        /* ... */
    }
    if (type === "sms") {
        /* ... */
    }
    // New channel = edit this function
}

// ✅ Open for extension via registry
interface NotificationChannel {
    send(message: string): Promise<void>;
}

class NotificationService {
    private channels = new Map<string, NotificationChannel>();

    register(name: string, channel: NotificationChannel): void {
        this.channels.set(name, channel);
    }

    async send(channelName: string, message: string): Promise<void> {
        const channel = this.channels.get(channelName);
        if (!channel)
            throw new Error(`Channel '${channelName}' not registered`);
        await channel.send(message);
    }
}
```

---

## When NOT to Apply OCP (Pragmatism)

OCP has upfront cost. Don't pre-abstract prematurely:

- Apply it when you **already have** two or more variations of the same behavior (Rule of Three)
- Or when a domain explicitly signals future variability (payment gateways, output formats, authentication strategies)
- Premature abstraction for YAGNI-violating cases adds complexity with no benefit

> "Make it work. Make it right. Make it fast." — Kent Beck
> Apply OCP at the "make it right" stage, once the variation pattern is proven.

---

## OCP Checklist

- [ ] Does adding a new variant require editing an existing class?
- [ ] Is there a chain of `if/else` or `switch` dispatching on a type discriminant?
- [ ] Are tests for existing behavior at risk when adding new features?
- [ ] Can new behavior be injected rather than hardcoded?

All "no" except the last → OCP is healthy.
