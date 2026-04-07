---
name: performance-aware-clean-code
trigger: "performance clean code, optimize code, fast code, profiling, cache, algorithm complexity, N+1 queries, memory efficiency"
---

# Performance-Aware Clean Code

> **"The first rule of optimization: don't. The second: don't yet."**
> — Michael A. Jackson

Performance and clean code are not opposed — they are sequential. Write clean first, then
optimize proven bottlenecks with measurements.

---

## The Optimization Workflow

```
1. Write clean code
2. Measure (profiler, benchmarks — not intuition)
3. Identify the actual bottleneck (usually I/O, N+1, or O(n²) algorithms)
4. Optimize the bottleneck
5. Measure again — verify the improvement
6. Keep code clean — refactor if optimization made it ugly
```

---

## Algorithmic Complexity First

Before any micro-optimization, fix algorithmic complexity:

```typescript
// ❌ O(n²) — nested loop, common in naive filtering/matching
function findDuplicates(items: string[]): string[] {
    const duplicates: string[] = [];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            if (items[i] === items[j] && !duplicates.includes(items[i])) {
                duplicates.push(items[i]);
            }
        }
    }
    return duplicates;
}

// ✅ O(n) — single pass with a Set
function findDuplicates(items: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const item of items) {
        if (seen.has(item)) duplicates.add(item);
        else seen.add(item);
    }
    return [...duplicates];
}
```

---

## The N+1 Query Problem (Most Common DB Performance Kill)

```typescript
// ❌ N+1: 1 query for orders + N queries for customers
async function getOrderSummaries(): Promise<OrderSummary[]> {
    const orders = await db.orders.findAll(); // 1 query
    return Promise.all(
        orders.map(async (order) => ({
            id: order.id,
            total: order.total,
            customerName: (await db.users.findById(order.customerId)).name, // N queries
        })),
    );
}

// ✅ Batch load: 2 queries total regardless of N
async function getOrderSummaries(): Promise<OrderSummary[]> {
    const orders = await db.orders.findAll();
    const customerIds = [...new Set(orders.map((o) => o.customerId))];
    const customers = await db.users.findByIds(customerIds); // 1 batch query
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return orders.map((order) => ({
        id: order.id,
        total: order.total,
        customerName: customerMap.get(order.customerId)?.name ?? "Unknown",
    }));
}
```

---

## Caching — Know When, Know Where

```typescript
// ✅ Memoization for pure, expensive computations
function memoize<Args extends unknown[], Return>(
    fn: (...args: Args) => Return,
    keyFn: (...args: Args) => string = (...args) => JSON.stringify(args),
): (...args: Args) => Return {
    const cache = new Map<string, Return>();
    return (...args: Args): Return => {
        const key = keyFn(...args);
        if (cache.has(key)) return cache.get(key)!;
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}

const expensiveCalc = memoize(computeExpensiveThing);

// ✅ Cache at the right layer — not scattered everywhere
class ProductCatalogService {
    private cache = new TTLCache<string, Product>({ ttl: 60_000 });

    async getProduct(id: string): Promise<Product> {
        const cached = this.cache.get(id);
        if (cached) return cached;

        const product = await this.repo.findById(id);
        this.cache.set(id, product);
        return product;
    }

    async updateProduct(
        id: string,
        data: UpdateProductInput,
    ): Promise<Product> {
        const product = await this.repo.update(id, data);
        this.cache.delete(id); // ← always invalidate on write
        return product;
    }
}
```

---

## Memory Efficiency

```typescript
// ✅ Stream large data — don't load everything into memory
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

async function* readLargeCSV(path: string): AsyncGenerator<string[]> {
    const stream = createReadStream(path);
    const rl = createInterface({ input: stream, crlfDelay: Infinity });
    for await (const line of rl) {
        yield line.split(",");
    }
}

async function processLargeFile(path: string): Promise<void> {
    for await (const row of readLargeCSV(path)) {
        await processRow(row); // processes one row at a time — O(1) memory
    }
}

// ✅ Object pooling for frequent allocations (avoid GC pressure)
class ConnectionPool {
    private available: Connection[] = [];
    private maxSize: number;

    acquire(): Connection {
        return this.available.pop() ?? new Connection();
    }

    release(conn: Connection): void {
        conn.reset();
        if (this.available.length < this.maxSize) {
            this.available.push(conn);
        }
    }
}
```

---

## Rust Performance Patterns

```rust
// ✅ Avoid unnecessary allocations — use references and slices
// ❌
fn get_name(user: &User) -> String { user.name.clone() }  // allocates
// ✅
fn get_name(user: &User) -> &str { &user.name }  // zero-cost reference

// ✅ Use iterators — they're zero-cost abstractions in Rust
let total: u64 = items.iter()
    .filter(|i| i.is_active)
    .map(|i| i.price * i.qty)
    .sum();  // no intermediate Vec — single pass

// ✅ Pre-allocate known capacities
let mut results = Vec::with_capacity(input.len());  // avoids reallocation

// ✅ Stack allocation for small fixed-size data
let buf: [u8; 256] = [0; 256];  // stack — no heap alloc
// vs:
let buf = vec![0u8; 256];       // heap alloc — only when size is dynamic
```

---

## Go Performance Patterns

```go
// ✅ Pre-allocate maps and slices when size is known
results := make([]Order, 0, len(rawOrders))  // capacity hint
index   := make(map[string]*Order, len(rawOrders))

// ✅ Avoid string concatenation in loops — use strings.Builder
var b strings.Builder
b.Grow(estimatedSize)  // pre-allocate
for _, item := range items {
    fmt.Fprintf(&b, "%s: %d\n", item.Name, item.Price)
}
result := b.String()

// ✅ sync.Pool for temporary objects to reduce GC pressure
var bufferPool = sync.Pool{
    New: func() any { return make([]byte, 0, 4096) },
}

func process(data []byte) []byte {
    buf := bufferPool.Get().([]byte)
    defer bufferPool.Put(buf[:0])  // reset and return
    // ... use buf
    return result
}
```

---

## Python Performance Patterns

```python
# ✅ Use built-ins — they're implemented in C
# ❌
total = 0
for item in items:
    total += item.price
# ✅
total = sum(item.price for item in items)

# ✅ dict lookup > list search for repeated key lookups
# ❌ O(n) per lookup
def find_user(users: list[User], user_id: str) -> User | None:
    return next((u for u in users if u.id == user_id), None)

# ✅ O(1) per lookup
users_by_id: dict[str, User] = {u.id: u for u in users}

# ✅ numpy/pandas for numerical bulk operations
import numpy as np
prices = np.array([item.price for item in items])
total = prices.sum()  # C-speed SIMD, not Python loops
```

---

## Performance Checklist

- [ ] Have you measured first? (not guessing with intuition)
- [ ] Are there N+1 query patterns in data access code?
- [ ] Are large data sets loaded into memory that could be streamed?
- [ ] Are hot-path functions O(n²) or worse when O(n) or O(log n) is available?
- [ ] Are caches invalidated on write, not just read?
- [ ] Are known-size collections pre-allocated (Rust `with_capacity`, Go `make`, Python `list * n`)?
- [ ] Is the profiler output attached to justify any non-obvious optimization?
