---
name: RULE-03-ERROR-HANDLING
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-03 — Error Handling

> **AI DIRECTIVE: Every possible failure path must be explicit, typed, and handled.
> Silent failures are bugs. Swallowed errors are lies to the caller.
> Never generate code that ignores, suppresses, or hides an error.**

---

## Absolute Prohibitions

```
// NEVER generate these patterns in ANY language:

// JS/TS — swallowed catch
try { riskyOp() } catch (e) {}
try { riskyOp() } catch (e) { console.log(e) }  // logging ≠ handling

// Go — ignored error
result, _ := riskyOp()  // _ discards the error entirely

// Rust — panic in production code
let val = map.get(key).unwrap();     // panics if None
let val = parse_int(s).expect("x");  // panics if err (OK only in tests)

// Python — bare except
try: risky()
except: pass   # swallows everything including KeyboardInterrupt

// Generic — returning null as a signal
function findUser(id) {
    return null  // did it fail? was it not found? caller has no idea
}
```

---

## Rule 3.1 — Every Error Must Be Typed

Generic errors (`Error("something went wrong")`) are useless in production.
Every error must carry: **what failed**, **where**, **why**.

```
// WRONG — generic, loses all context
throw new Error("failed")
return Error("operation failed")
raise Exception("error occurred")

// CORRECT — typed, contextual, searchable
// Pseudocode (map to target language's idiom):
class OrderNotFoundError extends DomainError {
    orderId: string
    message: "Order {orderId} not found in the system"
}

class PaymentDeclinedError extends DomainError {
    orderId: string
    reason: string
    gatewayCode: string
    message: "Payment declined for order {orderId}: {reason} (code: {gatewayCode})"
}
```

---

## Rule 3.2 — Build a Domain Error Hierarchy

Every project must have a typed error hierarchy. The AI must generate it if not present.

```
// Pseudocode — implement in the target language's idiom

AppError (base)
├── DomainError (business rule violations — expected, operational)
│   ├── NotFoundError
│   ├── ValidationError { fields: map<string, string> }
│   ├── ConflictError
│   └── AuthorizationError
└── InfrastructureError (unexpected — bugs, outages)
    ├── DatabaseError
    ├── NetworkError
    └── ConfigurationError

// Usage:
// - DomainErrors → surface to the caller (4xx HTTP, user-visible)
// - InfrastructureErrors → log, alert, return generic message (5xx HTTP)
```

**Language idioms:**

- **JS/TS:** Extend `Error`; use `instanceof` to discriminate
- **Rust:** `enum AppError` + `thiserror`; library code uses typed enums, app code uses `anyhow`
- **Go:** Sentinel `var ErrXxx = errors.New(...)` + `errors.As/Is`; custom `struct` errors for context
- **Python:** Subclass `Exception`; never raise bare `Exception`
- **Zig:** `error` sets + tagged unions for rich context

---

## Rule 3.3 — Errors Propagate With Context

When an error crosses a layer boundary, **wrap it with context**. Do not re-throw raw.

```
// WRONG — original context lost
function loadUserConfig(userId) {
    try {
        return db.query(`SELECT * FROM config WHERE user_id = '${userId}'`)
    } catch (err) {
        throw err  // raw re-throw — caller doesn't know WHERE this came from
    }
}

// CORRECT — context added at each boundary
function loadUserConfig(userId) {
    try {
        return db.query(...)
    } catch (err) {
        throw new ConfigLoadError(userId, "database query failed", { cause: err })
    }
}

// Rust equivalent:
fn load_user_config(user_id: &UserId) -> Result<Config, AppError> {
    db.query_config(user_id)
        .map_err(|e| AppError::ConfigLoad { user_id: user_id.clone(), source: e })
}

// Go equivalent:
func loadUserConfig(userID string) (*Config, error) {
    cfg, err := db.QueryConfig(userID)
    if err != nil {
        return nil, fmt.Errorf("load config for user %s: %w", userID, err)
    }
    return cfg, nil
}
```

---

## Rule 3.4 — Never Return Null/Nil as an Error Signal

Null as "not found" is ambiguous and forces caller to null-check. Use typed returns instead.

```
// WRONG
function findUser(id) {
    const user = db.users.get(id)
    return user || null  // null — did it fail? not found? something else?
}

// CORRECT — Option A: typed exception
function getUser(id) {
    const user = db.users.get(id)
    if (!user) throw new UserNotFoundError(id)
    return user  // guaranteed non-null
}

// CORRECT — Option B: Result/Option type (for functional style)
// Returns { found: true, value: User } | { found: false }
// Or Result<User, NotFoundError>
// Or Option<User> / Maybe<User>
```

---

## Rule 3.5 — Fail Fast at Boundaries

Validate all inputs at the entry point of every public function/method.
Don't let invalid data travel deep into the call stack.

```
// WRONG — invalid input travels 5 layers before blowing up
function createOrder(customerId, items, paymentMethod) {
    // ... 4 function calls later:
    // TypeError: Cannot read property 'amount' of undefined
}

// CORRECT — validate at the surface immediately
function createOrder(customerId, items, paymentMethod) {
    assertNonEmpty(customerId, "customerId")
    assertNonEmpty(items, "items")
    assertValidPaymentMethod(paymentMethod)
    // now proceed — all inputs are guaranteed valid
    return placeValidatedOrder(customerId, items, paymentMethod)
}
```

---

## Rule 3.6 — Separate Error Handling From Business Logic

Business logic must not be obscured by error handling code. Keep them in separate layers.

```
// WRONG — try/catch interwoven with business logic
async function processOrder(orderId) {
    try {
        const order = await repo.find(orderId)
        try {
            const charge = await payments.charge(order.total)
            if (!charge.ok) {
                await repo.updateStatus(orderId, 'failed')
                throw new PaymentError(charge.reason)
            }
            await repo.updateStatus(orderId, 'confirmed')
        } catch (payErr) {
            logger.error('payment failed', payErr)
            throw payErr
        }
    } catch (err) {
        logger.error('order processing failed', err)
        throw err
    }
}

// CORRECT — business logic is clean; error handling is at the orchestration layer
async function processOrder(orderId) {
    const order  = await findOrderOrThrow(orderId)
    const charge = await chargeOrderOrThrow(order)
    await confirmOrder(order, charge)
}
// Error handling lives in the HTTP handler / use-case wrapper
```

---

## Rule 3.7 — In Languages With Result Types, Use Them Exhaustively

In Rust/Zig/Go the AI must never suppress the error return:

```rust
// WRONG — suppressed
let _ = fs::write(path, data);  // fire and forget, error ignored

// CORRECT — handle or propagate
fs::write(path, data)
    .map_err(|e| ConfigError::WriteFailure { path: path.to_owned(), source: e })?;
```

```go
// WRONG
os.Remove(path)  // error return silently discarded

// CORRECT
if err := os.Remove(path); err != nil {
    return fmt.Errorf("cleanup temp file %s: %w", path, err)
}
```

---

## AI Self-Check Before Generating Error Handling

```
□ Is every possible failure path handled or explicitly propagated?
□ Are typed errors used (no bare `Error("msg")` in public APIs)?
□ Does every error carry enough context to debug without a stack trace?
□ Is null/nil return eliminated in favor of Result/Option/typed error?
□ Are errors wrapped with layer context when crossing boundaries?
□ Is business logic visually separated from error handling code?
□ In Rust: no .unwrap()/.expect() outside tests?
□ In Go: no `_` discarding error returns?
□ In Python: no bare `except:` or `except Exception: pass`?
```
