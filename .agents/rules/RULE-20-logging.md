---
name: RULE-20-LOGGING-OBSERVABILITY
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-20 — Logging & Observability

> **AI DIRECTIVE: A system you cannot observe is a system you cannot operate.
> Logs, metrics, and traces must be designed with the same discipline as code.
> Logs are for operators. Never log sensitive data. Always log with context.**

---

## Non-Negotiable Logging Rules

```
NEVER log:
  - Passwords or password hashes
  - API keys, tokens, or secrets (even partial)
  - Full credit card numbers (log only last 4 digits if needed)
  - PII beyond what is operationally necessary (emails, SSNs, etc.)
  - Raw request/response bodies without scrubbing sensitive fields
  - Stack traces to end users (log them server-side, return correlation ID)

ALWAYS log:
  - Errors with full context (what failed, request ID, relevant IDs)
  - Slow operations that exceed a threshold
  - Security-relevant events (login, failed auth, permission denied)
  - State transitions for business-critical flows
  - Service startup and shutdown
```

---

## Rule 20.1 — Use Structured Logging, Not Printf

Structured logs (key-value or JSON) are machine-readable, searchable, and filterable.
Plain string concatenation is not.

```
// WRONG — unstructured string logging
console.log("User " + userId + " placed order " + orderId + " total: " + total)
fmt.Printf("Processing order %s for user %s\n", orderId, userId)
print(f"Order {order_id} failed: {error}")

// CORRECT — structured key-value logging
// JS/TS (using pino, winston, etc.)
logger.info({ userId, orderId, totalCents: total }, "Order placed")
logger.error({ userId, orderId, error: err.message, stack: err.stack }, "Order placement failed")

// Go (using slog — standard library since 1.21)
slog.InfoContext(ctx, "Order placed",
    "user_id",   userID,
    "order_id",  orderID,
    "total",     totalCents,
)
slog.ErrorContext(ctx, "Order placement failed",
    "user_id",  userID,
    "order_id", orderID,
    "error",    err,
)

// Rust (using tracing)
tracing::info!(user_id = %user_id, order_id = %order_id, total = total_cents, "Order placed");
tracing::error!(user_id = %user_id, error = %err, "Order placement failed");

// Python (using structlog)
log.info("order_placed", user_id=user_id, order_id=order_id, total_cents=total)
log.error("order_failed", user_id=user_id, order_id=order_id, error=str(err))
```

---

## Rule 20.2 — Log Levels Used Correctly

```
TRACE / DEBUG:  Detailed diagnostic information; production off by default
               "Executing SQL: SELECT * FROM ..."
               "Cache miss for key: user-123"

INFO:           Normal system behavior worth recording
               "Service started on port 8080"
               "Order ord-123 confirmed"
               "User usr-456 logged in"

WARN:           Unexpected but recoverable; investigate if frequent
               "Payment retry attempt 2/3"
               "Config value missing, using default: timeout=30s"
               "Deprecated endpoint called: /api/v1/orders"

ERROR:          Failure requiring attention; operation could not complete
               "Database connection failed after 3 retries"
               "Order payment declined: insufficient funds"
               "Email delivery failed for user usr-789"

FATAL / CRITICAL: System cannot continue; immediate action required
               "Config file missing — cannot start"
               "Database schema migration failed"
```

---

## Rule 20.3 — Every Log Entry Must Have a Correlation/Request ID

In distributed systems and web servers, every log must carry a request ID so all logs
for one request can be grouped:

```
// Middleware: generate request ID at entry point
function requestLogger(req, res, next) {
    req.requestId = req.headers['x-request-id'] ?? crypto.randomUUID()
    res.setHeader('x-request-id', req.requestId)

    // Attach to logger context so all subsequent logs carry it
    req.log = logger.child({ requestId: req.requestId })
    next()
}

// Usage in handlers:
req.log.info({ userId, orderId }, "Processing order")
req.log.error({ error: err.message }, "Order failed")
// Every log for this request has the same requestId — trivially traceable
```

---

## Rule 20.4 — Log Security Events

These events must always be logged at INFO level (never DEBUG):

```
function auditLog(event: AuditEvent): void {
    securityLogger.info({
        event:     event.type,
        userId:    event.userId,
        resource:  event.resource,
        action:    event.action,
        success:   event.success,
        ip:        event.ipAddress,
        userAgent: event.userAgent,
        timestamp: new Date().toISOString(),
    })
}

// Log these events:
auditLog({ type: 'auth.login.success', userId, ... })
auditLog({ type: 'auth.login.failed', userId, reason: 'bad_password', ... })
auditLog({ type: 'auth.login.blocked', userId, reason: 'too_many_attempts', ... })
auditLog({ type: 'access.denied', userId, resource: '/admin/users', ... })
auditLog({ type: 'data.export', userId, recordCount: 1000, ... })
auditLog({ type: 'admin.user.deleted', actorId, targetUserId, ... })
```

---

## Rule 20.5 — Metrics — Instrument What Matters

Every significant operation should emit a metric. At minimum:

```
// Request metrics (usually automatic with HTTP middleware)
http_requests_total{method, path, status_code}
http_request_duration_seconds{method, path}

// Business metrics (manual)
orders_placed_total{region, payment_method}
payment_failures_total{reason}
email_send_duration_seconds
cache_hits_total / cache_misses_total

// System health
db_connection_pool_used / db_connection_pool_max
queue_depth{queue_name}
worker_active_count
```

---

## Rule 20.6 — Error Logs Include Actionable Context

```
// WRONG — no context; useless for debugging
logger.error("Something went wrong")
logger.error(err.message)

// CORRECT — everything needed to debug without reproducing
logger.error({
    error:     err.message,
    stack:     err.stack,
    requestId: ctx.requestId,
    userId:    ctx.userId,
    orderId:   order.id,
    operation: "charge_payment",
    attempt:   retryCount,
    duration:  Date.now() - startTime,
}, "Payment charge failed — will retry")
```

---

## Rule 20.7 — Never Log Sensitive Fields — Scrub Them

```
// WRONG — logs contain PII and secrets
logger.info({ user: req.body }, "Received registration request")
// req.body may contain password, SSN, credit card number

// CORRECT — explicit allowlist of safe-to-log fields
function scrubForLog(body: CreateUserInput) {
    return {
        email:  maskEmail(body.email),    // "j***@example.com"
        name:   body.name,
        // password: NEVER logged
        // ssn:      NEVER logged
    }
}
logger.info({ input: scrubForLog(req.body) }, "Received registration request")
```

---

## Observability Checklist

```
□ Is structured logging (key-value / JSON) used — not string concatenation?
□ Are log levels used correctly (DEBUG/INFO/WARN/ERROR/FATAL)?
□ Does every log entry carry a request/correlation ID?
□ Are security events (login, access denied, data export) always logged?
□ Are errors logged with full context (IDs, operation, attempt count, duration)?
□ Is sensitive data (passwords, tokens, full PII) scrubbed before logging?
□ Are key operations instrumented with metrics?
□ Do error logs contain enough information to debug without reproducing the issue?
```
