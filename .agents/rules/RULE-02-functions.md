---
name: RULE-02-FUNCTIONS
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-02 — Functions / Procedures / Methods

> **AI DIRECTIVE: Every function you generate does exactly ONE thing at ONE level of abstraction.
> If you cannot name a function in 3 words or fewer without using "and", it does too much.
> Split it.**

---

## The One-Thing Test

Before generating any function, answer:

1. What is the ONE thing this function does?
2. Are all operations inside it at the SAME level of abstraction?
3. Can I extract a meaningful sub-function from it? (If yes → extract it.)

```
// WRONG — "and" in the description = two things
// "validateInput AND saveToDatabase AND sendEmail"
function processUserRegistration(data) {
    if (!data.email.includes('@')) throw Error('bad email')
    if (data.password.length < 8) throw Error('short password')
    const hash = bcrypt.hash(data.password, 10)
    db.users.insert({ email: data.email, passwordHash: hash })
    mailer.send(data.email, 'Welcome!')
}

// CORRECT — each function does one thing
function processUserRegistration(data) {
    validateRegistrationInput(data)
    const user = persistNewUser(data)
    sendWelcomeEmail(user)
}

function validateRegistrationInput(data) { ... }
function persistNewUser(data) { ... }
function sendWelcomeEmail(user) { ... }
```

---

## Hard Limits — Never Exceed Without Explicit Justification

| Metric                | Limit           | Rationale                    |
| --------------------- | --------------- | ---------------------------- |
| Lines per function    | ≤ 20 (aim ≤ 10) | Forces single responsibility |
| Positional parameters | ≤ 3             | 4+ args → options object     |
| Nesting depth         | ≤ 3 levels      | Use guard clauses instead    |
| Abstraction levels    | 1 per function  | Don't mix high/low           |
| Return paths          | ≤ 5             | More → decompose logic       |
| Cyclomatic complexity | ≤ 10            | Number of independent paths  |

---

## Rule 2.1 — One Level of Abstraction Per Function

```
// WRONG — mixes high-level orchestration with low-level string manipulation
function generateReport(data) {
    const title = '<h1>' + data.title.trim().replace(/  +/g, ' ') + '</h1>'  // low-level
    const rows = data.items.map(buildReport)  // high-level
    return wrapInHTML(title, rows)  // high-level
}

// CORRECT — every call is at the same level
function generateReport(data) {
    const title = renderTitle(data.title)
    const rows  = renderItemRows(data.items)
    return wrapInHTML(title, rows)
}

function renderTitle(rawTitle) {
    return '<h1>' + normalizeWhitespace(rawTitle) + '</h1>'
}
```

---

## Rule 2.2 — Max 3 Parameters. Use Options/Config Objects Beyond That

```
// WRONG — 6 positional parameters, easy to mix up order
createUser("John", "Doe", "john@example.com", true, "admin", "2026-01-01")

// CORRECT — named options object; self-documenting at call site
createUser({
    firstName:      "John",
    lastName:       "Doe",
    email:          "john@example.com",
    sendWelcome:    true,
    role:           "admin",
    trialExpiresAt: "2026-01-01",
})
```

---

## Rule 2.3 — Command-Query Separation (CQS)

A function either **changes state** (command) OR **returns a value** (query). Never both.

```
// WRONG — modifies state AND returns a value
function popAndGet(stack) {
    const item = stack[stack.length - 1]
    stack.pop()
    return item  // side effect + return value = confusing
}

// CORRECT — separate command and query
function peek(stack) { return stack[stack.length - 1] }  // query
function pop(stack)  { stack.splice(-1, 1) }             // command

const item = peek(stack)
pop(stack)
```

---

## Rule 2.4 — No Side Effects Unless Named For It

A function named `calculateTotal` must NOT modify state. If it has side effects, the name must
signal it: `calculateAndSaveTotal`, `fetchAndCacheUser`.

Better: split them.

```
// WRONG — name promises a calculation but also mutates
function getDiscountedPrice(order) {
    order.discountApplied = true  // HIDDEN SIDE EFFECT
    return order.total * 0.9
}

// CORRECT
function applyDiscount(order) { order.discountApplied = true }
function calculateDiscountedPrice(order) { return order.total * 0.9 }
```

---

## Rule 2.5 — No Boolean Flag Arguments

Flag arguments say "this function does two things". Split it instead.

```
// WRONG — what does `true` mean?
renderButton(label, true)
sendEmail(user, false)

// CORRECT — named functions make intent explicit
renderPrimaryButton(label)
renderSecondaryButton(label)
sendWelcomeEmail(user)
sendPasswordResetEmail(user)
```

---

## Rule 2.6 — Guard Clauses Over Nested Conditionals

```
// WRONG — deeply nested, main logic buried at the bottom
function processOrder(order) {
    if (order != null) {
        if (order.items.length > 0) {
            if (order.customer.isVerified) {
                // actual logic here — 3 levels deep
                chargeAndFulfill(order)
            }
        }
    }
}

// CORRECT — guard clauses, happy path stays at ground level
function processOrder(order) {
    if (order == null)                  throw Error("order required")
    if (order.items.length == 0)        throw Error("order has no items")
    if (!order.customer.isVerified)     throw Error("customer not verified")

    chargeAndFulfill(order)  // happy path — clean, unindented
}
```

---

## Rule 2.7 — Prefer Expressions Over Statements for Simple Transformations

In languages that support it, pure transformations should be expressions, not imperative loops:

```
// WRONG — imperative accumulation for a simple transformation
const totals = []
for (let i = 0; i < orders.length; i++) {
    if (orders[i].status === 'confirmed') {
        totals.push(orders[i].total)
    }
}

// CORRECT — declarative, reads like a sentence
const confirmedTotals = orders
    .filter(order => order.status === 'confirmed')
    .map(order => order.total)
```

---

## AI Self-Check Before Generating a Function

```
□ Does the function name describe exactly ONE action?
□ Is the name a verb phrase?
□ Are all internal operations at the same abstraction level?
□ Is it ≤ 20 lines?
□ Does it have ≤ 3 positional parameters?
□ Are there any hidden side effects that the name doesn't signal?
□ Are boolean flag arguments eliminated?
□ Are nested conditionals replaced with guard clauses where possible?
□ Is it a pure query OR a command — not both?
```
