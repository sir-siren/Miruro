---
name: RULE-12-SEPARATION-OF-CONCERNS
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-12 — Separation of Concerns & Architecture Boundaries

> **AI DIRECTIVE: Every module, layer, and function must have one clearly defined concern.
> I/O belongs at the edges. Business rules belong in the center. Mixing them is the root
> cause of untestable, unswappable, fragile code.**

---

## The Core Architecture Rule

```
DEPENDENCY DIRECTION — ALWAYS:
  Outer layers depend on inner layers.
  Inner layers NEVER depend on outer layers.
  Business rules know NOTHING about databases, HTTP, or frameworks.

[UI / API / CLI]  ──depends on──▶  [Use Cases]  ──depends on──▶  [Domain / Entities]
[DB / Email / S3] ──depends on──▶  [Use Cases]
                                    ▲
                       outer layers implement interfaces
                       defined by inner layers
```

---

## Rule 12.1 — Never Put Business Logic in I/O Layers

```
// WRONG — HTTP handler contains business logic
function handleCreateOrder(request, response) {
    // Business logic IN the handler — untestable without HTTP stack
    const items = request.body.items
    let total = 0
    for (const item of items) {
        if (item.qty <= 0) {
            response.status(400).json({ error: "invalid qty" })
            return
        }
        total += item.price * item.qty
    }
    if (total < 1000) {
        response.status(400).json({ error: "min order $10" })
        return
    }
    const order = db.orders.create({ items, total })
    response.status(201).json(order)
}

// CORRECT — handler handles HTTP only; business logic is in the use case
function handleCreateOrder(request, response) {
    try {
        const command = parseCreateOrderCommand(request.body)   // parse input
        const order   = orderService.createOrder(command)        // business logic
        response.status(201).json(toOrderDTO(order))             // format output
    } catch (err) {
        handleHttpError(err, response)                           // error mapping
    }
}

// Business logic lives here — testable with no HTTP
class OrderService {
    createOrder(command) {
        validateOrderCommand(command)
        const total = calculateOrderTotal(command.items)
        assertMinimumOrderAmount(total)
        return this.repo.save(new Order(command, total))
    }
}
```

---

## Rule 12.2 — Never Put I/O in Domain Objects

Domain entities (Order, User, Invoice) must not talk to databases, APIs, or the filesystem.

```
// WRONG — domain entity knows about the database
class Order {
    async save() {
        await db.orders.upsert({ where: { id: this.id }, data: this.toRow() })
    }
    async load(id) {
        return db.orders.findOne({ where: { id } })
    }
}

// CORRECT — domain entity is pure; persistence is a separate concern
class Order {
    confirm()         { this.status = 'confirmed' }
    calculateTotal()  { return this.items.reduce((s, i) => s + i.total(), 0) }
    // NO database methods. NO network calls. Pure logic only.
}

// Persistence adapter — separate file, separate concern
class PostgresOrderRepository {
    async save(order)     { await db.orders.upsert(OrderMapper.toRow(order)) }
    async findById(id)    { return OrderMapper.toDomain(await db.orders.findOne({ id })) }
}
```

---

## Rule 12.3 — Separate Validation From Persistence From Transformation

These are three distinct concerns. Never merge them:

```
// WRONG — one function validates, queries, transforms, and saves
async function updateUserProfile(userId, rawInput) {
    if (!rawInput.name || rawInput.name.length < 2) throw Error("bad name")
    const user = await db.users.findOne({ id: userId })
    if (!user) throw Error("not found")
    user.name = rawInput.name.trim()
    user.bio  = rawInput.bio?.slice(0, 500)
    await db.users.save(user)
    return { id: user.id, name: user.name, bio: user.bio }  // transforms to DTO too
}

// CORRECT — each concern in its own function/layer
function validateProfileUpdate(input) {
    if (!input.name || input.name.length < 2) throw new ValidationError("name", "too short")
}

async function loadUserOrThrow(userId) {
    const user = await db.users.findOne({ id: userId })
    if (!user) throw new UserNotFoundError(userId)
    return user
}

function applyProfileUpdate(user, input) {
    return { ...user, name: input.name.trim(), bio: input.bio?.slice(0, 500) }
}

function toProfileDTO(user) {
    return { id: user.id, name: user.name, bio: user.bio }
}

// Use case orchestrates the separated concerns
async function updateUserProfile(userId, rawInput) {
    validateProfileUpdate(rawInput)
    const user    = await loadUserOrThrow(userId)
    const updated = applyProfileUpdate(user, rawInput)
    await db.users.save(updated)
    return toProfileDTO(updated)
}
```

---

## Rule 12.4 — The Layer Dependency Table

The AI must enforce these allowed and forbidden dependencies:

| From Layer                                            | May Import                            | Must NOT Import                        |
| ----------------------------------------------------- | ------------------------------------- | -------------------------------------- |
| **Domain** (entities, value objects, domain services) | Nothing external. Pure language only. | DB, HTTP, frameworks, external libs    |
| **Application** (use cases, services)                 | Domain layer + interfaces/ports       | Concrete DB/email/HTTP implementations |
| **Infrastructure** (repos, gateways, adapters)        | Domain layer + Application interfaces | Other infrastructure modules directly  |
| **Interface** (HTTP, CLI, UI)                         | Application use cases + DTOs          | Domain directly (go through use cases) |

---

## Rule 12.5 — One Composition Root

All concrete instantiations happen in ONE place (main / entry point).
Nothing else may call `new ConcreteImplementation()`.

```
// main.ts / main.go / main.rs — ONLY file with concrete `new`
const dbPool     = new PostgresConnectionPool(process.env.DATABASE_URL)
const emailQueue = new SendGridEmailQueue(process.env.SENDGRID_KEY)

const orderRepo    = new PostgresOrderRepository(dbPool)
const emailService = new SendGridEmailService(emailQueue)
const orderService = new OrderService(orderRepo, emailService)  // DIP satisfied
const orderHandler = new OrderHttpHandler(orderService)

app.post('/orders', orderHandler.handleCreate)
```

---

## Rule 12.6 — Separate Configuration From Code

```
// WRONG — hardcoded config in business logic
function connectToDatabase() {
    return pg.connect("postgresql://admin:password123@prod-db:5432/myapp")
}

// CORRECT — config is external; code reads it
function connectToDatabase(config) {
    return pg.connect(config.databaseUrl)
}

// Configuration loaded at the entry point only
const config = loadConfig(process.env)
const db = connectToDatabase(config)
```

---

## AI Self-Check for Separation of Concerns

```
□ Does any domain/entity class import from DB/HTTP/email libraries?
□ Does any HTTP handler contain business logic?
□ Is validation separated from persistence and transformation?
□ Do inner layers (domain, use cases) import from outer layers (DB, HTTP)?
□ Is there a single composition root where all concretions are wired?
□ Is configuration loaded at the entry point and injected — not hardcoded?
□ Could the business logic be tested with zero infrastructure?
□ Could the database be swapped by changing only the infrastructure layer?
```
