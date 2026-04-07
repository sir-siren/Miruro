---
name: RULE-17-CONCURRENCY-ASYNC
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-17 — Concurrency & Async

> **AI DIRECTIVE: Concurrency bugs are the hardest to reproduce and the most dangerous in
> production. Default to sequential code. Introduce concurrency only when there is a measured
> need, with explicit ownership of shared resources.**

---

## Core Concurrency Rules

```
ALWAYS:
  - Make the concurrency model explicit and visible in the code
  - Protect all shared mutable state with the appropriate synchronization primitive
  - Prefer message passing over shared memory (channels > mutexes where possible)
  - Give every goroutine/task/thread a clear owner and a defined lifetime
  - Cancel and clean up resources when a task is abandoned

NEVER:
  - Start a goroutine/thread/task without a way to observe its completion or failure
  - Spawn unbounded goroutines/tasks (always limit concurrency)
  - Share mutable state across tasks without synchronization
  - Assume that sequential code can simply be wrapped in async without review
  - Use sleep() as synchronization (use condition variables, channels, or semaphores)
```

---

## Rule 17.1 — Async/Await: Always Await, Never Fire-and-Forget

```
// WRONG — fire and forget; errors silently lost
function handleRequest(req, res) {
    sendAnalyticsEvent(req)  // not awaited — error disappears
    saveAuditLog(req)        // not awaited — timing unpredictable
    res.json(result)
}

// WRONG — forgotten promise in JS/TS
processOrder(order)          // returns Promise but nobody awaits it

// CORRECT — await every Promise that matters
async function handleRequest(req, res) {
    await Promise.all([
        sendAnalyticsEvent(req),   // awaited — errors surface
        saveAuditLog(req),
    ])
    res.json(result)
}

// When fire-and-forget IS intentional: document it AND handle errors
function handleRequest(req, res) {
    // Fire-and-forget: audit log is best-effort, must not block response
    sendAuditLog(req).catch(err => logger.error('audit log failed', err))
    res.json(result)
}
```

---

## Rule 17.2 — Parallel Async: Use Structured Concurrency

Run independent async operations in parallel, not sequentially:

```
// WRONG — sequential when operations are independent (2x slower for no reason)
async function loadDashboard(userId) {
    const user    = await loadUser(userId)          // 200ms
    const orders  = await loadOrders(userId)        // 200ms
    const notices = await loadNotifications(userId) // 200ms
    // Total: 600ms
}

// CORRECT — parallel (concurrent) when independent
async function loadDashboard(userId) {
    const [user, orders, notices] = await Promise.all([
        loadUser(userId),          // all three run simultaneously
        loadOrders(userId),        // total: ~200ms
        loadNotifications(userId),
    ])
    return buildDashboard(user, orders, notices)
}

// Go equivalent
func loadDashboard(ctx context.Context, userID string) (*Dashboard, error) {
    g, ctx := errgroup.WithContext(ctx)
    var user  *User
    var orders []*Order

    g.Go(func() error { var err error; user, err = loadUser(ctx, userID); return err })
    g.Go(func() error { var err error; orders, err = loadOrders(ctx, userID); return err })

    if err := g.Wait(); err != nil { return nil, err }
    return &Dashboard{User: user, Orders: orders}, nil
}

// Rust equivalent (tokio)
let (user, orders) = tokio::try_join!(
    load_user(user_id),
    load_orders(user_id),
)?;
```

---

## Rule 17.3 — Goroutines/Tasks Must Have Defined Lifetimes

```
// WRONG — goroutine leaked; no way to stop or observe it
func startWorker() {
    go func() {
        for {
            processJob()  // runs forever; caller has no handle; leak on shutdown
        }
    }()
}

// CORRECT — goroutine has a cancel channel and a done signal
func startWorker(ctx context.Context) <-chan error {
    errs := make(chan error, 1)
    go func() {
        defer close(errs)
        for {
            select {
            case <-ctx.Done():
                errs <- ctx.Err()
                return
            default:
                if err := processJob(ctx); err != nil {
                    errs <- err
                    return
                }
            }
        }
    }()
    return errs
}
```

---

## Rule 17.4 — Protect Shared Mutable State

```
// WRONG — data race: two goroutines/threads write to the same map simultaneously
var cache = map[string]User{}
go func() { cache[id] = user }()  // concurrent write — undefined behavior

// CORRECT — Option A: Mutex
type UserCache struct {
    mu    sync.RWMutex
    items map[string]User
}
func (c *UserCache) Set(id string, user User) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[id] = user
}
func (c *UserCache) Get(id string) (User, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    u, ok := c.items[id]
    return u, ok
}

// CORRECT — Option B: Channel (message passing > shared memory)
type cacheMsg struct { id string; user User }
cacheUpdates := make(chan cacheMsg, 100)
// One goroutine owns the map; others send messages to it
go func() {
    cache := map[string]User{}
    for msg := range cacheUpdates {
        cache[msg.id] = msg.user
    }
}()
```

---

## Rule 17.5 — Limit Concurrency — Never Spawn Unbounded Tasks

```
// WRONG — spawns N goroutines/tasks for N items (N could be 100,000)
for _, item := range items {
    go processItem(item)         // unbounded goroutine explosion
}

for _, item := range items {
    go func(i Item) { results <- process(i) }(item)  // same problem
}

// CORRECT — bounded worker pool
func processAll(ctx context.Context, items []Item) ([]Result, error) {
    const maxWorkers = 10
    sem  := make(chan struct{}, maxWorkers)  // semaphore
    var (
        mu      sync.Mutex
        results []Result
        errs    []error
        wg      sync.WaitGroup
    )

    for _, item := range items {
        wg.Add(1)
        sem <- struct{}{}  // acquire slot
        go func(item Item) {
            defer wg.Done()
            defer func() { <-sem }()  // release slot

            result, err := processItem(ctx, item)
            mu.Lock()
            if err != nil { errs = append(errs, err) } else { results = append(results, result) }
            mu.Unlock()
        }(item)
    }

    wg.Wait()
    if len(errs) > 0 { return nil, errors.Join(errs...) }
    return results, nil
}
```

---

## Rule 17.6 — Context Propagation (Go / Rust / Python async)

In Go: context is ALWAYS the first parameter of any function doing I/O or long work.
In Rust/Python async: use CancellationToken or asyncio.Task cancellation.

```
// Go — context everywhere
func (s *Service) ProcessOrder(ctx context.Context, id OrderID) (*Order, error) {
    order, err := s.repo.FindByID(ctx, id)   // ctx propagated down
    if err != nil { return nil, err }

    if err := s.payment.Charge(ctx, order.Total()); err != nil {  // ctx propagated
        return nil, fmt.Errorf("charge payment: %w", err)
    }
    return order, nil
}

// WRONG in Go — context not propagated
func (s *Service) ProcessOrder(id OrderID) (*Order, error) {
    order, err := s.repo.FindByID(context.Background(), id)  // Background = can't cancel!
    ...
}
```

---

## Rule 17.7 — Async Error Handling Must Be Exhaustive

```
// WRONG — Promise.all fails silently if one rejects
async function loadAll(ids) {
    const results = await Promise.all(ids.map(loadItem))  // one failure = all lost
    return results
}

// CORRECT — Option A: fail fast (use Promise.all — propagates first rejection)
async function loadAll(ids) {
    try {
        return await Promise.all(ids.map(loadItem))
    } catch (err) {
        throw new BatchLoadError(ids, err)  // with context
    }
}

// CORRECT — Option B: collect all results including failures
async function loadAll(ids) {
    const outcomes = await Promise.allSettled(ids.map(loadItem))
    const failed   = outcomes.filter(r => r.status === 'rejected')
    if (failed.length > 0) {
        logger.warn(`${failed.length}/${ids.length} items failed to load`, failed)
    }
    return outcomes
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value)
}
```

---

## Concurrency Checklist

```
□ Is every async operation awaited (no fire-and-forget without explicit error handling)?
□ Are independent async operations run in parallel (Promise.all / try_join / errgroup)?
□ Does every goroutine/task have a defined lifetime and cancellation path?
□ Is all shared mutable state protected by a mutex or replaced with message passing?
□ Is concurrency bounded (worker pool / semaphore) — no unbounded spawning?
□ Is context propagated through every I/O function (Go)?
□ Are async error paths handled — not just happy path?
□ Is there any sleep() used as synchronization? → Replace with a proper primitive
```
