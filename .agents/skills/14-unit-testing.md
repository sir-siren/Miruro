---
name: clean-code-unit-testing
trigger: "unit tests, testing, TDD, FIRST principles, clean tests, test quality, test readability"
---

# Clean Code — Unit Testing

> **"Test code is just as important as production code. It requires thought, design, and care."**
> — Robert C. Martin

Clean tests are the foundation of confident refactoring. A messy test suite is worse than no
tests: it slows you down without providing safety.

---

## The F.I.R.S.T. Principles

| Letter | Principle       | Meaning                                                         |
| ------ | --------------- | --------------------------------------------------------------- |
| **F**  | Fast            | Tests run in milliseconds, not seconds. Slow tests get skipped. |
| **I**  | Independent     | No test depends on another test's state. Any order, any subset. |
| **R**  | Repeatable      | Same result in any environment — local, CI, laptop, production. |
| **S**  | Self-validating | Returns pass/fail. No manual log inspection needed.             |
| **T**  | Timely          | Written at the same time as (or before) the production code.    |

---

## The Three Laws of TDD

1. **Don't write production code** until you have a failing test for it
2. **Don't write more test code** than is sufficient to make a failing test
3. **Don't write more production code** than is sufficient to pass the failing test

---

## Anatomy of a Clean Test

Use the **Arrange-Act-Assert (AAA)** structure, with a blank line between each phase:

```typescript
// ✅ Clean test — AAA structure, single concept, readable name
describe("OrderService", () => {
    describe("placeOrder", () => {
        it("should save the order and send a confirmation email when valid", async () => {
            // Arrange
            const mockRepo = new MockOrderRepository();
            const mockEmail = new MockEmailService();
            const service = new OrderService(mockRepo, mockEmail);
            const order = buildTestOrder({ customerId: "cust-1", total: 5000 });

            // Act
            await service.placeOrder(order);

            // Assert
            expect(mockRepo.savedOrders).toHaveLength(1);
            expect(mockRepo.savedOrders[0].id).toBe(order.id);
            expect(mockEmail.sentEmails[0].to).toBe(order.customerEmail);
        });

        it("should throw ValidationError when order total is negative", async () => {
            // Arrange
            const service = new OrderService(
                new MockOrderRepository(),
                new MockEmailService(),
            );
            const invalidOrder = buildTestOrder({ total: -100 });

            // Act & Assert
            await expect(service.placeOrder(invalidOrder)).rejects.toThrow(
                ValidationError,
            );
        });
    });
});
```

---

## Test Naming Conventions

Name tests so they serve as documentation:

```typescript
// Pattern: [unit] should [behavior] when [condition]
// Or simply: [expected behavior] when [condition]

it("should return null when user does not exist");
it("should throw AuthError when password is incorrect");
it("should send welcome email after successful registration");
it("calculates compound interest correctly for 10 years at 5%");
it("returns an empty array when no items match the filter");
```

---

## One Concept Per Test

```typescript
// ❌ Tests multiple concepts — when it fails, you don't know which assertion failed
it("processes order correctly", async () => {
    await service.placeOrder(order);
    expect(repo.savedOrders).toHaveLength(1);
    expect(emailService.sentEmails).toHaveLength(1);
    expect(order.status).toBe("confirmed");
    expect(order.confirmedAt).toBeDefined();
    expect(logger.logs).toContain(`Order ${order.id} confirmed`);
});

// ✅ One test, one concept
it("saves the order to the repository", async () => {
    await service.placeOrder(order);
    expect(repo.savedOrders).toHaveLength(1);
});

it("sends a confirmation email to the customer", async () => {
    await service.placeOrder(order);
    expect(emailService.sentEmails[0].to).toBe(order.customerEmail);
});

it("marks the order as confirmed", async () => {
    await service.placeOrder(order);
    expect(order.status).toBe("confirmed");
});
```

---

## Test Doubles — The Right Tool for Each Job

| Type      | When to Use                                                |
| --------- | ---------------------------------------------------------- |
| **Stub**  | Return canned data; don't care how many times called       |
| **Mock**  | Verify behavior (was method called? with what args?)       |
| **Spy**   | Wrap real object; verify calls without replacing behavior  |
| **Fake**  | Lightweight real implementation (in-memory DB, fake clock) |
| **Dummy** | Satisfy a parameter requirement; never actually used       |

```typescript
// Fake — simplest and most readable for repositories
class FakeUserRepository implements UserRepository {
    private users = new Map<string, User>();

    async save(user: User): Promise<void> {
        this.users.set(user.id, user);
    }
    async findById(id: string): Promise<User | null> {
        return this.users.get(id) ?? null;
    }
    async findAll(): Promise<User[]> {
        return [...this.users.values()];
    }
}

// Mock — verify that an email was sent (behavior verification)
class MockEmailService implements EmailService {
    readonly calls: Array<{ to: string; subject: string; body: string }> = [];

    async send(to: string, subject: string, body: string): Promise<void> {
        this.calls.push({ to, subject, body });
    }

    wasCalledWith(to: string): boolean {
        return this.calls.some((c) => c.to === to);
    }
}
```

---

## Test Data Builders (Object Mother / Builder)

Don't repeat object construction boilerplate in every test:

```typescript
// Test data builder
function buildUser(overrides: Partial<User> = {}): User {
    return {
        id: "user-test-001",
        email: "test@example.com",
        name: "Test User",
        role: "viewer",
        isActive: true,
        createdAt: new Date("2026-01-01"),
        ...overrides,
    };
}

// Usage — only specify what's relevant to this test
const adminUser = buildUser({ role: "admin" });
const inactiveUser = buildUser({ isActive: false });
const newUser = buildUser({ id: "new-user", createdAt: new Date() });
```

---

## Common Anti-Patterns to Avoid

| Anti-Pattern                       | Why Bad                        | Fix                                            |
| ---------------------------------- | ------------------------------ | ---------------------------------------------- |
| `sleep(100)` in tests              | Flaky, slow                    | Use fake clocks (vitest's `vi.useFakeTimers`)  |
| Real network/DB calls              | Slow, unreliable, non-isolated | Use fakes/mocks or integration tests           |
| `console.log` debugging in tests   | Tests must be self-validating  | Use expect assertions                          |
| Shared mutable state between tests | Tests affect each other        | Reset state in `beforeEach`                    |
| Giant setup in `beforeEach`        | Unclear what's relevant        | Move setup into each test or factory functions |
| Testing implementation details     | Brittle                        | Test behavior and outcomes, not internal state |

---

## Test Coverage Strategy

Coverage alone is not the goal — meaningful coverage is:

```
Unit tests:        70–80% — fast, isolated, business logic
Integration tests: 15–20% — repository + DB, HTTP layers
E2E tests:          5–10% — critical user journeys only
```

**Coverage target:** 80% line coverage, 100% on critical paths (auth, payments, data mutations).
