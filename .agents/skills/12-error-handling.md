---
name: clean-code-error-handling
trigger: "error handling, exceptions, try catch, null handling, error types, Result type, error boundaries"
---

# Clean Code — Error Handling

> **"Error handling is important, but if it obscures logic, it's wrong."**
> — Robert C. Martin

Error handling is a first-class concern, not an afterthought. But error logic should be isolated
from business logic — they should not intertwine.

---

## Rule 1: Use Exceptions, Not Error Codes

Error codes force callers into nested conditionals that obscure intent:

```typescript
// ❌ Error codes — call sites are ugly, errors are easily ignored
function parseConfig(raw: string): Config | number {
    if (!raw) return -1;
    if (!isValidJSON(raw)) return -2;
    if (!hasRequiredFields(raw)) return -3;
    return JSON.parse(raw) as Config;
}

const result = parseConfig(input);
if (result === -1) {
    /* handle */
} else if (result === -2) {
    /* handle */
} else if (result === -3) {
    /* handle */
} else {
    use(result as Config);
}

// ✅ Typed exceptions — happy path reads clearly
class ConfigParseError extends Error {
    constructor(reason: string) {
        super(`Config parse failed: ${reason}`);
    }
}

function parseConfig(raw: string): Config {
    if (!raw) throw new ConfigParseError("input is empty");
    if (!isValidJSON(raw)) throw new ConfigParseError("not valid JSON");
    if (!hasRequiredFields(raw))
        throw new ConfigParseError("missing required fields");
    return JSON.parse(raw) as Config;
}

try {
    const config = parseConfig(input);
    use(config);
} catch (err) {
    if (err instanceof ConfigParseError) handleConfigError(err);
    else throw err; // re-throw unknown errors
}
```

---

## Rule 2: Don't Return `null` — Don't Pass `null`

`null` is the "billion-dollar mistake." It silently propagates and causes runtime crashes far from
the source.

```typescript
// ❌ Returns null — every caller must null-check
async function findUser(id: string): Promise<User | null> {
    return db.users.findOne({ id });
}

const user = await findUser(id);
user.name; // TypeError: Cannot read property 'name' of null — if you forget to check

// ✅ Option 1: Throw a typed error
async function getUser(id: string): Promise<User> {
    const user = await db.users.findOne({ id });
    if (!user) throw new UserNotFoundError(id);
    return user; // guaranteed non-null
}

// ✅ Option 2: Return a Result/Option type (functional style)
type Option<T> = { found: true; value: T } | { found: false };

async function findUser(id: string): Promise<Option<User>> {
    const user = await db.users.findOne({ id });
    return user ? { found: true, value: user } : { found: false };
}

const result = await findUser(id);
if (result.found) {
    console.log(result.value.name); // TypeScript narrows — safe
}
```

---

## Rule 3: Provide Context With Exceptions

Every exception should tell you: WHAT went wrong, WHERE, and WHY.

```typescript
// ❌ Generic error loses all context
throw new Error("Failed");

// ✅ Rich, specific error with context
class PaymentProcessingError extends Error {
    constructor(
        public readonly orderId: string,
        public readonly reason: string,
        public readonly gatewayCode?: string,
        cause?: Error,
    ) {
        super(`Payment failed for order ${orderId}: ${reason}`);
        this.name = "PaymentProcessingError";
        if (cause) this.cause = cause;
    }
}

throw new PaymentProcessingError(
    order.id,
    "Insufficient funds",
    "CARD_DECLINED",
    originalError,
);
```

---

## Rule 4: Define Exception Hierarchy by Use Case

```typescript
// Base error class with context
abstract class AppError extends Error {
    abstract readonly statusCode: number;
    abstract readonly isOperational: boolean;

    constructor(message: string, cause?: Error) {
        super(message);
        this.name = this.constructor.name;
        if (cause) this.cause = cause;
    }
}

// Domain-specific errors
class NotFoundError extends AppError {
    readonly statusCode = 404;
    readonly isOperational = true;
}

class ValidationError extends AppError {
    readonly statusCode = 400;
    readonly isOperational = true;
    constructor(public readonly fields: Record<string, string>) {
        super("Validation failed");
    }
}

class AuthorizationError extends AppError {
    readonly statusCode = 403;
    readonly isOperational = true;
}

class InfrastructureError extends AppError {
    readonly statusCode = 500;
    readonly isOperational = false; // unexpected — should page on-call
}
```

---

## Rule 5: Separate Error Handling From Business Logic

```typescript
// ❌ Error handling interwoven with business logic — hard to read both
async function processOrder(orderId: string): Promise<void> {
    try {
        const order = await db.orders.findById(orderId);
        if (!order) {
            logger.warn(`Order ${orderId} not found`);
            metrics.increment("order.not_found");
            return;
        }
        try {
            await paymentService.charge(order);
        } catch (paymentErr) {
            logger.error("Payment failed", paymentErr);
            await db.orders.updateStatus(orderId, "payment_failed");
            throw paymentErr;
        }
        await db.orders.updateStatus(orderId, "confirmed");
        await emailService.sendConfirmation(order);
    } catch (err) {
        logger.error("Order processing failed", err);
        throw err;
    }
}

// ✅ Business logic clean — error handling delegated to wrapper
async function processOrder(orderId: string): Promise<void> {
    const order = await getOrderOrThrow(orderId);
    await chargeOrder(order);
    await confirmOrder(order);
}

// Error handling lives in the orchestration layer or middleware
async function handleProcessOrder(orderId: string): Promise<void> {
    try {
        await processOrder(orderId);
    } catch (err) {
        await handleOrderError(orderId, err);
        throw err;
    }
}
```

---

## The Result Pattern (For Functional Error Handling)

Useful in TypeScript when you want explicit, compile-time error handling without exceptions:

```typescript
type Result<T, E extends Error = Error> =
    | { ok: true; value: T }
    | { ok: false; error: E };

function parseJSON<T>(raw: string): Result<T, SyntaxError> {
    try {
        return { ok: true, value: JSON.parse(raw) as T };
    } catch (err) {
        return { ok: false, error: err as SyntaxError };
    }
}

const result = parseJSON<Config>(rawInput);
if (!result.ok) {
    console.error("Parse failed:", result.error.message);
    return;
}

// TypeScript knows result.value is Config here
applyConfig(result.value);
```

---

## Error Handling Checklist

- [ ] Are `null` returns replaced with typed errors or Result types?
- [ ] Does every exception carry enough context to debug without a stack trace alone?
- [ ] Is error handling logic separated from business logic?
- [ ] Are errors re-thrown when not handled (avoid swallowing errors)?
- [ ] Is there a defined exception hierarchy for the domain?
- [ ] Are operational errors (expected) distinguished from programmer errors (bugs)?
