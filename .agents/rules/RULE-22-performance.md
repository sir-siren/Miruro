---
name: RULE-22-PERFORMANCE
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-22 — Performance & Algorithmic Thinking

> **AI DIRECTIVE: Correctness first. Clarity second. Performance third — and only when measured.
> The right algorithm beats any micro-optimization. Profile before you optimize.
> Never sacrifice readability for speculative performance gains.**

---

## The Optimization Hierarchy

```
1. Choose the right algorithm (O(n) vs O(n²) vs O(n log n))   ← highest leverage
2. Choose the right data structure (hash map vs array vs tree)  ← second highest
3. Eliminate unnecessary I/O (N+1 queries, redundant network calls)
4. Reduce allocations in hot paths
5. Micro-optimize (bit tricks, SIMD, cache alignment)          ← lowest; justify with profiler
```

Never do step 5 before confirming steps 1–4 are optimal.

---

## Rule 22.1 — Always Choose the Correct Algorithmic Complexity First

```
// WRONG — O(n²) for a lookup problem that is O(1) with a hash map
function findUser(users, id) {
    for (const user of users) {   // O(n) scan every time
        if (user.id === id) return user
    }
    return null
}
// Called 1000 times on a list of 1000 users = 1,000,000 iterations

// CORRECT — O(1) lookup after O(n) preprocessing
const usersById = new Map(users.map(u => [u.id, u]))   // O(n) once
function findUser(id) { return usersById.get(id) }      // O(1) every time

// WRONG — O(n²) duplicate detection
function hasDuplicates(arr) {
    for (let i = 0; i < arr.length; i++)
        for (let j = i + 1; j < arr.length; j++)
            if (arr[i] === arr[j]) return true
    return false
}

// CORRECT — O(n) with a Set
function hasDuplicates(arr) {
    const seen = new Set()
    for (const item of arr) {
        if (seen.has(item)) return true
        seen.add(item)
    }
    return false
}
```

---

## Rule 22.2 — The N+1 Query Problem Must Be Eliminated

The most common database performance bug. Always detected and fixed.

```
// WRONG — 1 query for the list + N queries for each item's related data
async function getOrdersWithCustomers() {
    const orders = await db.orders.findAll()         // 1 query
    for (const order of orders) {
        order.customer = await db.users.findById(order.customerId)  // N queries
    }
    return orders
    // 1000 orders = 1001 database round trips
}

// CORRECT — 2 queries total, regardless of N
async function getOrdersWithCustomers() {
    const orders     = await db.orders.findAll()
    const customerIds = [...new Set(orders.map(o => o.customerId))]
    const customers  = await db.users.findByIds(customerIds)  // 1 batch query
    const customerMap = new Map(customers.map(c => [c.id, c]))

    return orders.map(order => ({
        ...order,
        customer: customerMap.get(order.customerId),
    }))
    // 1000 orders = 2 database round trips always
}

// Alternative: use JOIN in the database query (most efficient)
const orders = await db.query(`
    SELECT o.*, u.name as customer_name, u.email as customer_email
    FROM orders o
    JOIN users u ON u.id = o.customer_id
`)
```

---

## Rule 22.3 — Choose the Right Data Structure

| Operation Needed                                  | Use                                    |
| ------------------------------------------------- | -------------------------------------- |
| Lookup by key                                     | Hash Map / Dictionary                  |
| Membership test                                   | Set / Hash Set                         |
| Ordered traversal                                 | Sorted array / B-tree                  |
| FIFO queue                                        | Deque / ring buffer                    |
| LIFO stack                                        | Vec/Array with push/pop                |
| Priority ordering                                 | Heap / Priority Queue                  |
| Range queries                                     | B-tree / sorted array                  |
| Frequent insertion/deletion at arbitrary position | Linked list (rarely; cache-unfriendly) |

```
// WRONG — using array for membership test (O(n) per check)
const blockedUsers = ['user-1', 'user-2', 'user-3', ...]
function isBlocked(userId) {
    return blockedUsers.includes(userId)  // O(n) scan
}

// CORRECT — using Set (O(1) per check)
const blockedUserIds = new Set(['user-1', 'user-2', 'user-3', ...])
function isBlocked(userId) {
    return blockedUserIds.has(userId)  // O(1) hash lookup
}
```

---

## Rule 22.4 — Pre-allocate Known Capacities

Avoid repeated reallocations in loops when final size is known:

```
// Rust — pre-allocate
let mut results = Vec::with_capacity(input.len());  // no realloc during push

// Go — pre-allocate
results := make([]Order, 0, len(rawOrders))         // no realloc during append
index   := make(map[string]*Order, len(rawOrders))  // no realloc during insert

// Python — list comprehension is more efficient than append in a loop
results = [process(item) for item in items]   // single allocation

// JS/TS — pre-sized array for indexed fill
const results = new Array(items.length)
for (let i = 0; i < items.length; i++) { results[i] = process(items[i]) }
```

---

## Rule 22.5 — Stream Large Data — Never Load All Into Memory

```
// WRONG — loads 10GB file into memory
const content = fs.readFileSync('huge-export.csv', 'utf-8')
const lines = content.split('\n')
lines.forEach(processLine)

// CORRECT — stream line by line
import { createInterface } from 'node:readline'
import { createReadStream } from 'node:fs'

const rl = createInterface({ input: createReadStream('huge-export.csv') })
for await (const line of rl) {
    await processLine(line)
}

// Go
scanner := bufio.NewScanner(file)
for scanner.Scan() {
    processLine(scanner.Text())
}

// Rust
let reader = BufReader::new(File::open(path)?);
for line in reader.lines() {
    process_line(line?)?;
}

// Python
with open('huge-export.csv') as f:
    for line in f:           # file iterator is lazy — O(1) memory
        process_line(line)
```

---

## Rule 22.6 — Caching Rules

```
// Cache only when:
// 1. The operation is measurably slow (profiled, not assumed)
// 2. The result is deterministic for the same input
// 3. Staleness is acceptable for the TTL chosen
// 4. The cache is invalidated on write

// WRONG — cache not invalidated on write (stale reads)
class ProductService {
    private cache = new Map()

    async getProduct(id) {
        if (this.cache.has(id)) return this.cache.get(id)
        const product = await db.products.findById(id)
        this.cache.set(id, product)
        return product
    }

    async updateProduct(id, data) {
        await db.products.update(id, data)
        // BUG: cache still has old value — reads stale data
    }
}

// CORRECT — invalidate on write
async updateProduct(id, data) {
    await db.products.update(id, data)
    this.cache.delete(id)   // ← always invalidate on mutation
}
```

---

## Rule 22.7 — Measure Before Optimizing

```
// The process:
1. Write correct, clean code
2. Identify a real performance problem (profiler output, user complaint, SLO breach)
3. Measure the current baseline
4. Form a hypothesis about the bottleneck
5. Apply ONE optimization
6. Measure again — verify improvement
7. If code became unreadable: document WHY with a comment referencing the benchmark

// NEVER:
// - Optimize based on intuition without measurement
// - Sacrifice readability for a speculative performance gain
// - Introduce complexity "in case it gets slow"

// Comment format when a deliberate performance optimization makes code less obvious:
// PERF: Using bit manipulation instead of modulo — 3x faster on hot path
//       Benchmark: bench/hash_test.go:42 — 1.2ns vs 3.8ns per call
const isEven = (n & 1) === 0
```

---

## Performance Checklist

```
□ Is the algorithm's complexity appropriate for the input size?
□ Are hash maps / sets used for membership tests and key lookups?
□ Are N+1 query patterns eliminated?
□ Are known-size collections pre-allocated?
□ Is large data streamed rather than loaded into memory?
□ Are caches invalidated on write?
□ Is any optimization backed by profiler output — not assumption?
□ Are non-obvious optimizations documented with their benchmark rationale?
```
