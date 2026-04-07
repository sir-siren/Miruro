---
name: code-review-standards
trigger: "code review, PR review, pull request, review checklist, giving feedback, review comments, what to look for in review"
---

# Code Review Standards

> **"Code review is one of the most effective tools for spreading knowledge, catching bugs, and
> maintaining standards. But only when done with the right mindset."**

Code review is a collaborative act. The goal is **better software**, not finding fault. Reviewers
are advocates for the codebase's future maintainers.

---

## The Reviewer's Mindset

**Ask, don't tell.** Prefer questions over statements:

- ❌ "This is wrong. Use a factory."
- ✅ "I'm wondering — would a factory pattern help decouple this? Curious what you think."

**Be specific.** Vague feedback is frustrating:

- ❌ "This is messy."
- ✅ "This function handles validation, database access, and email sending — could we split it by SRP?"

**Distinguish severity:**

- 🔴 **Blocker** — must be fixed before merge (correctness, security, major design flaw)
- 🟡 **Suggestion** — should fix, good for quality (naming, refactoring opportunity)
- 🟢 **Nit** — optional, personal preference (minor style, cosmetic)

---

## The Author's Responsibility

Before requesting review:

- [ ] Code does what the PR description says
- [ ] Tests pass locally (and are meaningful, not just coverage-padding)
- [ ] Self-review done — re-read every diff as if someone else wrote it
- [ ] No debug code, `console.log`, commented-out blocks
- [ ] PR is appropriately sized (< 400 lines changed is ideal)

---

## Review Checklist — What to Look For

### 1. Correctness

- [ ] Does the code do what it's supposed to do?
- [ ] Are edge cases handled? (empty input, null, zero, max values, concurrent access)
- [ ] Are there obvious logic errors or off-by-one issues?
- [ ] Do the tests actually test the right behavior?

### 2. Design & Architecture

```typescript
// Watch for these design smells in review:

// ❌ Business logic in controller
app.post("/users", async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10); // should be in domain/service
    // ...
});

// ❌ Direct concrete dependency
class OrderService {
    private repo = new MySQLOrderRepository(); // DIP violation
}

// ❌ God method — does too much
async function processCheckout() {
    /* 80 lines */
}

// ❌ Ignored errors
try {
    await riskyOperation();
} catch {} // swallowed — should at least log
```

### 3. Security

- [ ] Is user input validated and sanitized before use?
- [ ] Are SQL queries parameterized (no string interpolation into queries)?
- [ ] Are secrets/credentials hardcoded anywhere?
- [ ] Is authorization checked, not just authentication?
- [ ] Is sensitive data (PII, passwords) logged anywhere?

```typescript
// 🔴 Security blockers:
const query = `SELECT * FROM users WHERE email = '${email}'`; // SQL injection
const API_KEY = "sk-prod-abc123"; // hardcoded secret
logger.info("Login attempt", { password }); // logging password
```

### 4. Performance

- [ ] Are there N+1 query issues (fetching related data in a loop)?
- [ ] Are there unnecessary computations inside render/loop paths?
- [ ] Are large payloads paginated?
- [ ] Are expensive operations cached where appropriate?

```typescript
// ❌ N+1 query — 1 query for orders + N queries for users
const orders = await getOrders();
for (const order of orders) {
    order.customer = await getUser(order.customerId); // N queries!
}

// ✅ Eager load or batch
const orders = await getOrdersWithCustomers(); // JOIN in DB
```

### 5. Readability & Naming

- [ ] Are names intention-revealing?
- [ ] Are functions doing one thing at one level of abstraction?
- [ ] Are magic numbers replaced with named constants?
- [ ] Are comments explaining WHY, not WHAT?

### 6. Test Quality

- [ ] Do tests have descriptive names?
- [ ] Is each test testing one concept (single assertion of intent)?
- [ ] Are there tests for edge cases and error paths, not just happy path?
- [ ] Do tests use proper doubles (not real network/DB)?

### 7. Clean Code Basics

- [ ] Max 300 lines per file?
- [ ] No `any` in TypeScript?
- [ ] No commented-out code?
- [ ] No dead code?

---

## Giving Great Feedback — Examples

```
🔴 Blocker:
"This directly interpolates user input into the SQL query — this is a SQL injection
vulnerability. Please use parameterized queries:
  db.query('SELECT * FROM users WHERE email = $1', [email])"

🟡 Suggestion:
"This function looks like it's doing three things: parsing, validating, and persisting.
SRP would suggest splitting it. Would it make sense to extract parseInvoiceData() and
validateInvoiceData() as separate functions? Happy to discuss if there's a reason to keep
it together."

🟢 Nit:
"Nit: `d` as a variable name isn't very descriptive. `daysSinceCreation` might be clearer,
though feel free to ignore — not a big deal."

✅ Praise (use it!):
"Nice refactor here — the extracted `calculateDiscount()` makes the intent really clear
compared to the inline version. 👍"
```

---

## PR Size Guidelines

| PR Size | Lines Changed | Turnaround | Notes                                   |
| ------- | ------------- | ---------- | --------------------------------------- |
| Small   | < 100         | Hours      | Ideal — fast review, easy to understand |
| Medium  | 100–400       | Same day   | Acceptable for feature work             |
| Large   | 400–800       | 1–2 days   | Consider splitting                      |
| Huge    | 800+          | Risky      | Hard to review thoroughly — split it    |

---

## What Not to Block On

Things that should be automated (linting, formatting) should never be manual review comments.
If Prettier/ESLint would catch it, configure them to catch it automatically — don't waste human
review bandwidth on style.

**Reserve human review for:**

- Correctness and logic
- Design and architecture
- Security
- Domain understanding and business requirements alignment
