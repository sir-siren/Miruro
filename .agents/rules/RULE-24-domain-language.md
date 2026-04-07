---
name: RULE-24-DOMAIN-LANGUAGE
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-24 — Domain Modeling & Ubiquitous Language

> **AI DIRECTIVE: Code is the authoritative model of the business domain.
> Use the same vocabulary as domain experts. Domain concepts must be first-class
> citizens in the code — not awkward technical translations of business terms.**

---

## Rule 24.1 — Code Must Speak the Domain Language

If a business analyst says "invoice" and the code says "BillingDocument", they are speaking
different languages. This gap causes misunderstandings, bugs, and wasted effort.

```
// WRONG — technical vocabulary disconnected from business domain
class DataRecord {
    processEntry(payload: Record<string, unknown>): void
    updateRow(id: string, delta: Partial<unknown>): void
    deleteRow(id: string): void
}

// What is a "DataRecord"? What is an "entry"? What is a "row"?
// A domain expert has no idea what this code represents.

// CORRECT — domain vocabulary makes code readable to non-programmers
class Invoice {
    issue(customer: Customer): IssuedInvoice
    markAsPaid(payment: Payment): PaidInvoice
    void(reason: VoidReason): VoidedInvoice
    applyDiscount(discount: Discount): Invoice
}
// A billing team member can read this code and understand it.
```

---

## Rule 24.2 — Domain Events Are First-Class Concepts

When something happens in the business domain, model it as an explicit event — not a
buried side effect in a service method.

```
// WRONG — side effects buried in a service call; domain events implicit
class OrderService {
    async confirmOrder(orderId) {
        await db.orders.update(orderId, { status: 'confirmed' })
        await mailer.send(order.email, 'Order confirmed')
        await inventory.reserve(order.items)
        await analytics.track('order_confirmed', order)
        // What actually happened? All these side effects are invisible from the name
    }
}

// CORRECT — domain event is explicit; effects are decoupled
class Order {
    confirm(): OrderConfirmedEvent {
        if (this.status !== 'placed') throw new InvalidTransitionError(this.status, 'confirmed')
        this.status = 'confirmed'
        this.confirmedAt = new Date()
        return new OrderConfirmedEvent(this.id, this.customerId, this.items)
    }
}

// Handlers are registered for the event — decoupled, testable, obvious
eventBus.on(OrderConfirmedEvent, sendConfirmationEmail)
eventBus.on(OrderConfirmedEvent, reserveInventory)
eventBus.on(OrderConfirmedEvent, trackAnalytics)
```

---

## Rule 24.3 — State Machines for Lifecycle Concepts

Business entities often have a lifecycle (Order: draft→placed→confirmed→shipped→delivered).
Model this as an explicit state machine with valid transitions — not loose string comparisons.

```
// WRONG — status as loose string; any status can transition to any other
order.status = "shipped"   // did we validate this transition was legal? No.

// CORRECT — explicit state machine with valid transitions
const OrderTransitions: Record<OrderStatus, OrderStatus[]> = {
    draft:     ['placed', 'cancelled'],
    placed:    ['confirmed', 'cancelled'],
    confirmed: ['shipped',  'cancelled'],
    shipped:   ['delivered'],
    delivered: [],
    cancelled: [],
}

function transitionOrder(order: Order, newStatus: OrderStatus): Order {
    const validNext = OrderTransitions[order.status]
    if (!validNext.includes(newStatus)) {
        throw new InvalidOrderTransitionError(order.id, order.status, newStatus)
    }
    return { ...order, status: newStatus, [`${newStatus}At`]: new Date() }
}

// Usage
const shipped = transitionOrder(order, 'shipped')    // valid
const invalid  = transitionOrder(order, 'cancelled') // throws — already shipped
```

---

## Rule 24.4 — Aggregate Roots Control Their Own Invariants

An aggregate is a cluster of domain objects with one root that enforces all business rules
for the cluster. External code ONLY interacts with the root — never directly with internals.

```
// WRONG — external code bypasses the aggregate root to mutate internals
order.items.push(new OrderItem(productId, qty, price))  // bypasses Order's rules
order.items[0].qty = -5                                   // bypasses validation

// CORRECT — all mutations go through the aggregate root
class Order {
    private _items: OrderItem[] = []

    addItem(productId: ProductId, qty: Quantity, price: Money): void {
        if (this._status !== 'draft') throw new OrderNotModifiableError(this.id)
        if (qty.value <= 0)           throw new InvalidQuantityError(qty)

        const existing = this._items.find(i => i.productId.equals(productId))
        if (existing) {
            existing.increaseQuantity(qty)
        } else {
            this._items.push(new OrderItem(productId, qty, price))
        }
    }

    // Read-only view — callers cannot mutate the internal array
    get items(): ReadonlyArray<OrderItem> { return [...this._items] }
}
```

---

## Rule 24.5 — Bounded Contexts — Same Word, Different Meaning

The same term can mean different things in different parts of the system.
Acknowledge this explicitly — don't force one model to serve all contexts.

```
// "Customer" means different things to different teams:
// Sales context:     Customer { id, name, loyaltyPoints, purchaseHistory }
// Shipping context:  Customer { id, shippingAddress, preferredCarrier }
// Billing context:   Customer { id, billingAddress, paymentMethods }

// WRONG — one giant Customer class tries to serve all three contexts
class Customer {
    id, name, email, loyaltyPoints, purchaseHistory,
    shippingAddress, preferredCarrier, deliveryInstructions,
    billingAddress, paymentMethods, taxId, invoicePreferences
    // This class has THREE reasons to change (see SRP Rule-04)
}

// CORRECT — each bounded context has its own Customer model
// In the Sales module:
type SalesCustomer = { id: CustomerId; name: string; loyaltyPoints: number }

// In the Shipping module:
type ShippingRecipient = { id: CustomerId; address: ShippingAddress; carrier: Carrier }

// In the Billing module:
type BillingAccount = { id: CustomerId; billingAddress: Address; paymentMethods: PaymentMethod[] }
```

---

## Rule 24.6 — Repository Names Match Domain Language

Repositories are named after what they store and how domain experts talk about access:

```
// WRONG — generic technical names
class DataStore { }
class DBManager { }
class RecordFetcher { }

// CORRECT — domain-named repositories
class OrderRepository {
    findByCustomer(customerId: CustomerId): Promise<Order[]>
    findPendingAfter(date: Date): Promise<Order[]>
    findByTrackingNumber(tracking: TrackingNumber): Promise<Order | null>
}

class InvoiceRepository {
    findOverdue(): Promise<Invoice[]>
    findUnpaidForCustomer(customerId: CustomerId): Promise<Invoice[]>
}
```

---

## Domain Language Checklist

```
□ Does every class/function name come from the business domain vocabulary?
□ Would a domain expert understand the class names and method names?
□ Are domain events modeled as explicit types — not buried side effects?
□ Are lifecycle transitions enforced by a state machine — not ad-hoc string assignments?
□ Does the aggregate root control all mutations to its cluster?
□ Are different bounded contexts given their own models — not one mega-model?
□ Do repository methods use domain language (findOverdue, findByCustomer, findPending)?
□ Is the code readable as a description of business behavior — not just technical operations?
```
