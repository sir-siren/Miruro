---
name: RULE-07-TESTING
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-07 — Testing

> **AI DIRECTIVE: Tests are first-class production code. They are not optional, not an afterthought,
> and not separate from "real work". Every non-trivial piece of logic must have tests.
> A test suite you don't trust is worse than no tests — it gives false confidence.**

---

## Non-Negotiable Testing Rules

```
ALWAYS:
  - Write tests alongside (or before) production code — not after
  - Structure every test: Arrange → Act → Assert (blank line between phases)
  - Name tests so they serve as documentation of behavior
  - Test behavior and outcomes — not internal implementation details
  - Cover: happy path + every error path + edge cases (empty, zero, max, null)

NEVER:
  - Use real databases, network calls, or file I/O in unit tests
  - Use sleep() or arbitrary timeouts in tests (use fake clocks)
  - Assert on irrelevant details (brittle tests)
  - Test the same concept in multiple assertions of one test
  - Leave TODO tests or skip blocks in committed code without a tracking reference
  - Use index-based keys or random data without seeding in tests
```

---

## Rule 7.1 — The FIRST Principles

Every test must satisfy all five:

| Letter               | Principle                                  | Violation                                                    |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| **F** ast            | Completes in milliseconds                  | Calls real DB / network → NOT fast                           |
| **I** ndependent     | No test depends on another test's state    | Shared mutable test state → NOT independent                  |
| **R** epeatable      | Same result every run, any environment     | Time-dependent, random, file-path-dependent → NOT repeatable |
| **S** elf-validating | Pass/fail is automatic                     | Requires manual log inspection → NOT self-validating         |
| **T** imely          | Written with (or before) the code it tests | Written months later → NOT timely                            |

---

## Rule 7.2 — AAA Structure Is Mandatory

```
// Every test follows Arrange → Act → Assert with blank lines separating phases

// WRONG — no structure, unclear what's being tested
test("order", () => {
    const o = new Order("c1", items)
    o.confirm()
    expect(o.status).toBe("confirmed")
    expect(o.confirmedAt).toBeDefined()
    expect(notifier.calls).toHaveLength(1)  // tests 3 different concerns
})

// CORRECT — AAA structure, one concept per test
test("should mark order as confirmed when placed", () => {
    // Arrange
    const order = buildTestOrder({ customerId: "c1", items: testItems })

    // Act
    order.confirm()

    // Assert
    expect(order.status).toBe("confirmed")
})

test("should record confirmation timestamp when confirmed", () => {
    const order = buildTestOrder()
    const before = Date.now()

    order.confirm()

    expect(order.confirmedAt.getTime()).toBeGreaterThanOrEqual(before)
})
```

---

## Rule 7.3 — Test Names Are Documentation

```
// WRONG — useless names
test("works")
test("test order")
test("it should do the thing")
it("test 1")

// CORRECT — names describe behavior as requirements
test("should throw ValidationError when email is missing")
test("should return null when user does not exist")
test("should apply 10% discount for orders with 10+ items")
test("should reject negative amounts with NegativeAmountError")
test("should send welcome email after successful registration")

// Pattern: [unit] [should/when] [behavior] [condition]
```

---

## Rule 7.4 — One Concept Per Test

Each test verifies **one behavioral assertion**. When it fails, you know exactly what broke.

```
// WRONG — multiple unrelated assertions in one test
test("processes checkout", async () => {
    await checkout.process(cart, user)
    expect(paymentService.charged).toBe(true)         // concept 1
    expect(orderRepo.saved).toBe(true)                // concept 2
    expect(emailService.sentTo).toBe(user.email)      // concept 3
    expect(cart.status).toBe("completed")             // concept 4
    expect(inventoryService.reserved).toBe(true)      // concept 5
})

// CORRECT — one concept, clear failure signal
test("should charge payment when checking out", async () => {
    await checkout.process(cart, user)
    expect(paymentService.charged).toBe(true)
})

test("should save order after payment succeeds", async () => {
    await checkout.process(cart, user)
    expect(orderRepo.saved).toBe(true)
})
```

---

## Rule 7.5 — Test Doubles: Use the Right Tool

| Double Type | Use When                                                     | Never Use For                          |
| ----------- | ------------------------------------------------------------ | -------------------------------------- |
| **Fake**    | Need a working lightweight impl (in-memory repo, fake clock) | Hiding that a real dependency exists   |
| **Stub**    | Need to return controlled data                               | Verifying behavior (use Mock for that) |
| **Mock**    | Need to verify a method was called with specific args        | State testing (use Fake for that)      |
| **Spy**     | Need to wrap real behavior and observe calls                 | Replacing complex logic                |
| **Dummy**   | Need to satisfy a parameter that's never used                | Any important dependency               |

```
// In-memory fake — best for repositories
class InMemoryOrderRepository {
    private orders = new Map()
    async save(order)          { this.orders.set(order.id, order) }
    async findById(id)         { return this.orders.get(id) ?? null }
    async findAll()            { return [...this.orders.values()] }
}

// Spy email service — records calls for assertion
class SpyEmailService {
    sent = []
    async send(to, subject, body) { this.sent.push({ to, subject, body }) }
    wasCalledWith(to) { return this.sent.some(e => e.to === to) }
}

// Usage: compose test-specific wiring
const repo  = new InMemoryOrderRepository()
const email = new SpyEmailService()
const svc   = new OrderService(repo, email)  // same DIP injection as production
```

---

## Rule 7.6 — Test Data Builders

Never duplicate object construction boilerplate across tests. Create builder functions:

```
// Test data builder — provides sensible defaults, override only what matters
function buildOrder(overrides = {}) {
    return {
        id:         "ord-test-001",
        customerId: "cust-test-001",
        status:     "draft",
        items:      [buildOrderItem()],
        createdAt:  new Date("2026-01-01"),
        ...overrides,
    }
}

function buildOrderItem(overrides = {}) {
    return { productId: "prod-001", qty: 1, unitPrice: 1000, ...overrides }
}

// Test only sets what's relevant
const overdueOrder = buildOrder({ createdAt: new Date("2024-01-01") })
const adminOrder   = buildOrder({ customerId: "admin-001" })
const bulkOrder    = buildOrder({ items: Array(15).fill(buildOrderItem()) })
```

---

## Rule 7.7 — Coverage Targets

| Layer                                  | Target    | Note                                  |
| -------------------------------------- | --------- | ------------------------------------- |
| Domain logic (entities, value objects) | 100%      | Pure functions — trivial to test      |
| Use cases / services                   | ≥ 90%     | All paths including errors            |
| Infrastructure adapters                | ≥ 70%     | Integration tests acceptable here     |
| UI components                          | ≥ 60%     | Behavior tests; not visual regression |
| Config / wiring / main                 | No target | Too risky to mock; covered by E2E     |

---

## AI Self-Check for Testing

```
□ Does every non-trivial function have at least one test?
□ Are tests following AAA structure with blank lines?
□ Does the test name describe behavior, not implementation?
□ Is each test testing exactly one concept?
□ Are the right test doubles used (Fake for state, Mock for behavior)?
□ Are test data builders used instead of repeated construction boilerplate?
□ Is there no real I/O (DB, network, filesystem) in unit tests?
□ Are all error paths tested — not just the happy path?
□ Would a failing test immediately tell me WHAT broke and WHY?
```
