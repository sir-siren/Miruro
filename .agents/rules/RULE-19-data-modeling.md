---
name: RULE-19-DATA-MODELING
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-19 — Data Modeling & Types

> **AI DIRECTIVE: The type system is the first line of defense against bugs.
> Model domain concepts precisely. Make invalid data impossible to represent.
> A type that allows invalid states is an invitation for a runtime bug.**

---

## Rule 19.1 — Make Invalid States Unrepresentable

Design data types so the compiler rejects invalid values, not runtime code.

```
// WRONG — optional fields imply ambiguous combinations
// Which combinations are valid? Unclear. Bugs waiting to happen.
interface ApiResponse<T> {
    data?:      T
    error?:     string
    isLoading?: boolean
    statusCode?: number
}
// Is { data: x, error: "oops" } valid? What about { isLoading: true, data: x }?

// CORRECT — discriminated union makes every state explicit and exclusive
type ApiState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T; statusCode: number }
    | { status: 'error';   message: string; statusCode: number }
// Impossible to be both 'loading' and have 'data'. The type enforces it.

// Rust equivalent
enum ApiState<T> {
    Idle,
    Loading,
    Success { data: T, status_code: u16 },
    Error   { message: String, status_code: u16 },
}

// Zig equivalent
const ApiState = union(enum) {
    idle,
    loading,
    success: struct { data: []const u8, status_code: u16 },
    @"error": struct { message: []const u8, status_code: u16 },
};
```

---

## Rule 19.2 — Primitive Obsession — Replace Raw Primitives With Domain Types

```
// WRONG — raw primitives carry no domain meaning; easy to mix up
fn transfer(from_account: &str, to_account: &str, amount: f64) { ... }
transfer(to_account_id, from_account_id, amount)  // silently swapped!

function createOrder(userId: string, productId: string, qty: number) { ... }
createOrder(productId, userId, qty)  // swapped — compiles, runs, wrong

// CORRECT — domain types prevent mixing
// Each type is distinct at compile time

// TypeScript — branded types
type UserId    = string & { readonly __brand: 'UserId' }
type ProductId = string & { readonly __brand: 'ProductId' }
type Quantity  = number & { readonly __brand: 'Quantity' }

function createOrder(userId: UserId, productId: ProductId, qty: Quantity) { ... }
createOrder(productId, userId, qty)  // ← TYPE ERROR at compile time

// Rust — newtype pattern
struct UserId(String);
struct AccountId(String);
struct Money(i64);  // store as cents — no floating-point precision issues

fn transfer(from: &AccountId, to: &AccountId, amount: Money) { ... }

// Go — type aliases with methods
type UserID    string
type AccountID string
type Cents     int64

func Transfer(from AccountID, to AccountID, amount Cents) error { ... }
```

---

## Rule 19.3 — Value Objects Are Immutable and Self-Validating

Value objects represent concepts that have value but no identity (Money, Email, PhoneNumber,
DateRange, Coordinates). They must be:

1. Immutable — no setters
2. Self-validating — constructor/factory throws on invalid input
3. Value-equal — two `Money(100, USD)` are equal if they represent the same value

```
// CORRECT value object pattern (pseudocode, apply per language)

class Email {
    private constructor(readonly value: string) {}

    static parse(raw: string): Email {
        const normalized = raw.trim().toLowerCase()
        if (!normalized.includes('@') || normalized.length < 5) {
            throw new InvalidEmailError(raw)
        }
        return new Email(normalized)
    }

    equals(other: Email): boolean { return this.value === other.value }
    toString(): string { return this.value }
}

// Once you have an Email object, it IS valid. No further checks needed.
function sendEmail(to: Email, subject: string, body: string): void {
    mailer.send(to.value, subject, body)  // guaranteed valid
}
```

---

## Rule 19.4 — Entity Identity Is Explicit and Typed

Entities (objects with identity: User, Order, Product) must have:

- A strongly-typed ID (not a raw string or int)
- Identity equality (two entities with the same ID are the same)
- A factory or constructor that generates valid IDs

```
// WRONG — raw string as entity ID
class User { id: string; ... }
const user1 = { id: "user-123" }
const user2 = { id: "order-456" }
doSomethingWithUser(user2.id)  // passed an order ID — compiles fine, wrong

// CORRECT — typed entity ID
class UserId {
    private constructor(readonly value: string) {}
    static generate(): UserId { return new UserId(crypto.randomUUID()) }
    static parse(raw: string): UserId {
        if (!raw.startsWith('usr_')) throw new InvalidIdError('UserId', raw)
        return new UserId(raw)
    }
    equals(other: UserId): boolean { return this.value === other.value }
}

class User {
    constructor(
        readonly id: UserId,
        // ...
    ) {}
    equals(other: User): boolean { return this.id.equals(other.id) }
}
```

---

## Rule 19.5 — Avoid Stringly Typed Code

```
// WRONG — string used as a type discriminant (stringly typed)
function processStatus(status: string) {
    if (status === "pending") { ... }
    else if (status === "active") { ... }
    else if (status === "suspended") { ... }
    // Any string is accepted — typos compile fine
}
processStatus("pendng")  // typo — compiles, wrong behavior

// CORRECT — enum / union / const enum
type AccountStatus = "pending" | "active" | "suspended"  // TS union
// or
enum AccountStatus { Pending = "pending", Active = "active", Suspended = "suspended" }

// Rust
enum AccountStatus { Pending, Active, Suspended }

// Go
type AccountStatus string
const (
    StatusPending   AccountStatus = "pending"
    StatusActive    AccountStatus = "active"
    StatusSuspended AccountStatus = "suspended"
)
```

---

## Rule 19.6 — Money Is Never a Float

Floating-point arithmetic is wrong for money. Always use integer cents/pence/minor units.

```
// WRONG — floating point money causes precision bugs
let price = 19.99
let tax   = price * 0.08    // 1.5992000000000002 — wrong!
let total = price + tax     // 21.589200000000002 — wrong!

// CORRECT — integer cents, convert only for display
const priceCents = 1999      // $19.99
const taxCents   = Math.round(priceCents * 0.08)   // 160 cents = $1.60 (rounded)
const totalCents = priceCents + taxCents             // 2159 cents = $21.59

function displayPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
}
```

---

## Rule 19.7 — Null/Optional Hygiene

```
RULES:
  - A function either ALWAYS returns a value OR it signals "not found" explicitly
  - Use Option<T> / T | null / Maybe<T> for genuinely optional values
  - Use Result<T, E> / throws for operations that can fail
  - Never use null/undefined/nil to signal an error — that's what errors are for
  - Never chain optional access without collapsing to a safe default at the end

// WRONG — null used for both "not found" and "error occurred"
function getUser(id) {
    try {
        return db.findUser(id) || null  // null = not found OR db failed?
    } catch {
        return null  // ambiguous!
    }
}

// CORRECT — distinct signals for distinct outcomes
function findUser(id: UserId): User | null {
    return db.findUser(id)  // null ONLY means "not found"
}
function getUser(id: UserId): User {
    const user = db.findUser(id)
    if (!user) throw new UserNotFoundError(id)  // explicit error on failure
    return user  // guaranteed non-null
}
```

---

## Data Modeling Checklist

```
□ Are discriminated unions / sum types used for mutually exclusive states?
□ Are domain primitives (IDs, Money, Email) typed — not raw string/number?
□ Are value objects immutable and self-validating?
□ Is money stored as integer cents — not floating point?
□ Are enum/union types used instead of raw string discriminants?
□ Is null/undefined used only for "genuinely not present" — not for errors?
□ Do entity types have typed IDs that prevent mixing different entity IDs?
□ Does the type system prevent the most common invalid states at compile time?
```
