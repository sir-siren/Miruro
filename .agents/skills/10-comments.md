---
name: clean-code-comments
trigger: "comments, when to comment, bad comments, good comments, code documentation, JSDoc, inline comments"
---

# Clean Code — Comments

> **"Don't comment bad code — rewrite it."**
> — Brian W. Kernighan & P.J. Plaugher

Comments are a last resort. Every comment is an admission that the code didn't fully communicate
its intent. The best comment is no comment — when the code is clear enough to speak for itself.

---

## The Hard Truth About Comments

Comments **lie**. Code is the only source of truth. Comments rot as code evolves but comments
stay stale. The more comments, the more maintenance burden.

```typescript
// ❌ This comment is a lie — the function returns null for missing users,
// but the comment says it throws. Nobody updated it.
/**
 * Gets user by ID.
 * @throws UserNotFoundError if user doesn't exist
 */
async function getUser(id: string): Promise<User | null> {
    return db.users.findOne({ id }); // returns null, not throws
}
```

---

## Comments That Are Worth Keeping

### ✅ Legal Comments

```typescript
// Copyright (c) 2026 Siren Security. MIT License.
// See LICENSE.md at the root of this repository.
```

### ✅ Explanation of Intent (WHY, not WHAT)

```typescript
// We sort descending here because the UI expects the most recent item first.
// The API returns ascending order — see API contract v2.3 issue #441.
return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
```

### ✅ Clarification of Non-Obvious Code

```typescript
// Mutex protects concurrent writes from multiple worker threads.
// Using a reentrant lock — this function is called recursively in graph traversal.
const lock = new ReentrantMutex();
```

### ✅ Warning of Consequences

```typescript
// WARNING: Changing this timeout will break the integration tests.
// The external service has a known delay of ~400ms on staging.
const EXTERNAL_API_TIMEOUT_MS = 500;

// NOTE: This function modifies the input array in-place for performance.
// Clone before passing if you need the original.
function sortInPlace(arr: number[]): void {
    arr.sort((a, b) => a - b);
}
```

### ✅ TODO / FIXME (with tracking info)

```typescript
// TODO(#1234 — 2026-03-21): Replace with proper pagination once API supports cursor-based paging
const items = await fetchAll()

// FIXME(#892): Race condition when two sessions update the same resource concurrently
async function updateResource(id: string, data: unknown): Promise<void> { ... }
```

### ✅ Public API / JSDoc

```typescript
/**
 * Calculates the compound interest over a given period.
 *
 * @param principal - The initial investment amount in cents
 * @param annualRate - Annual interest rate as a decimal (e.g., 0.05 for 5%)
 * @param years - Number of years to compound
 * @returns The total amount in cents after compounding
 *
 * @example
 * compoundInterest(100_000, 0.05, 10) // → 162_889 cents (~$1,628.89)
 */
function compoundInterest(
    principal: number,
    annualRate: number,
    years: number,
): number {
    return Math.round(principal * (1 + annualRate) ** years);
}
```

---

## Comments to Delete Immediately

### ❌ Redundant / Noise Comments

```typescript
// Sets the user's name ← tells us nothing the code doesn't already tell us
user.name = newName

// Check if user is active
if (user.isActive) { ... }
```

### ❌ Commented-Out Code

```typescript
// function oldGetUser(id) {
//   return db.query(`SELECT * FROM users WHERE id = ${id}`)
// }

// ← Just delete it. That's what git is for.
```

### ❌ Misleading Comments

```typescript
// Returns the day of the week
function getDayNumber(date: Date): number {
    return date.getDate(); // ← returns day of MONTH, not week — comment is wrong
}
```

### ❌ Mandated Comments (auto-generated noise)

```typescript
/**
 * @param name The name parameter
 * @param age The age parameter
 * @returns The result
 */
function createUser(name: string, age: number): User { ... }
// ← Adds zero information. Every parameter is obvious from its name.
```

### ❌ Journal / Change-Log Comments

```typescript
// 2024-01-15 John: Added validation
// 2024-02-03 Jane: Fixed bug with null email
// 2026-01-10 Siren: Refactored for performance
// ← This is what git log is for.
```

### ❌ Closing Brace Comments

```typescript
if (condition) {
    for (const item of items) {
        // ...
    } // end for
} // end if
// ← Symptom of over-nested code. Flatten it instead.
```

### ❌ Attributions

```typescript
// Added by Siren — 2026-01-10
// ← Git blame exists for this reason.
```

---

## The Comment Decision Tree

```
Can I rewrite the code to make this comment unnecessary?
├── YES → Rewrite the code. Delete the comment.
└── NO  → Is this comment explaining WHY (not WHAT)?
          ├── YES → Keep it. It adds value.
          └── NO  → Delete it. It's noise.
```

---

## Refactoring Comments Away

```typescript
// ❌ Comment tries to explain cryptic code
// Check if user has been inactive for more than 30 days
if ((Date.now() - user.lastLogin.getTime()) > 2_592_000_000) { ... }

// ✅ Extract to a named function — comment becomes unnecessary
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1_000

function isInactiveForThirtyDays(user: User): boolean {
  return (Date.now() - user.lastLogin.getTime()) > THIRTY_DAYS_MS
}

if (isInactiveForThirtyDays(user)) { ... }
```

---

## Comment Quality Checklist

- [ ] Does this comment say something the code can't say for itself?
- [ ] Is this explaining WHY (not WHAT or HOW)?
- [ ] Will this comment stay accurate when the code changes?
- [ ] Does this comment have a ticket/date reference if it's a TODO?
- [ ] Is this public API documentation that readers need?

If none of these apply → delete the comment.
