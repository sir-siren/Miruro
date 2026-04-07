---
name: dry-principle
trigger: "DRY, don't repeat yourself, duplication, code reuse, extract, single source of truth"
---

# DRY — Don't Repeat Yourself

> **"Every piece of knowledge must have a single, unambiguous, authoritative representation
> within a system."**
> — Andrew Hunt & David Thomas, _The Pragmatic Programmer_ (1999)

DRY is about **knowledge duplication**, not just code duplication. If you have to change the same
concept in two places to make a logical change, DRY is violated — even if the code looks different.

---

## What DRY Really Means

DRY is about avoiding **duplication of knowledge** — not blindly de-duplicating every similar-
looking code fragment.

```typescript
// These look similar but represent DIFFERENT knowledge — don't force DRY
function validateUserEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateContactEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// If user validation rules and contact validation rules happen to be the same TODAY
// but will diverge in the future (contacts might allow subdomains, users might not),
// keeping them separate is CORRECT. Premature DRY creates accidental coupling.
```

---

## Types of Duplication

### Type 1: Code Duplication (Most Obvious)

```typescript
// ❌ Copy-pasted price formatting in 4 components
const price = `$${(amount / 100).toFixed(2)}`;

// ✅ Single source of truth
function formatCents(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}
```

### Type 2: Logic Duplication (Sneaky)

```typescript
// ❌ "Is user eligible for discount?" logic lives in 3 places:
// - In the cart calculation service
// - In the checkout confirmation page
// - In the marketing email template

// They happen to use the same threshold today, but when it changes,
// only 2 of 3 get updated — a bug is born.

// ✅ Single authoritative location
class DiscountEligibilityPolicy {
    static isEligible(user: User): boolean {
        return user.totalPurchases > 500_00 && user.accountAge > 90;
    }
}
```

### Type 3: Data Duplication (Configuration)

```typescript
// ❌ Same timeout value hardcoded in 6 files as 5000
// ✅ Single constant, imported everywhere
export const API_TIMEOUT_MS = 5_000;
```

### Type 4: Documentation Duplication

```typescript
// ❌ Same business rule described in comment AND code AND README — they'll diverge
/** Users older than 30 days get a discount */ // comment
const DISCOUNT_THRESHOLD_DAYS = 30; // config
// README: "Users get a discount after 30 days of membership" — third copy

// ✅ Name the constant so the code IS the documentation
const DISCOUNT_ELIGIBILITY_DAYS = 30;
// No comment needed — the name is the documentation
```

---

## How to Apply DRY

### Step 1: Extract Function

```typescript
// Before: duplicated parsing logic
const startDate = new Date(rawStart.replace(/-/g, "/"));
const endDate = new Date(rawEnd.replace(/-/g, "/"));

// After
function parseDate(raw: string): Date {
    return new Date(raw.replace(/-/g, "/"));
}

const startDate = parseDate(rawStart);
const endDate = parseDate(rawEnd);
```

### Step 2: Extract Constants

```typescript
// Before: magic number in 5 places
if (user.sessions > 3) { ... }

// After
const MAX_CONCURRENT_SESSIONS = 3
if (user.sessions > MAX_CONCURRENT_SESSIONS) { ... }
```

### Step 3: Extract Shared Types

```typescript
// Before: pagination params duplicated in every query function
async function getUsers(page: number, limit: number, sort: string) {}
async function getOrders(page: number, limit: number, sort: string) {}
async function getProducts(page: number, limit: number, sort: string) {}

// After
interface PaginationOptions {
    page: number;
    limit: number;
    sort?: string;
}

async function getUsers(options: PaginationOptions) {}
async function getOrders(options: PaginationOptions) {}
async function getProducts(options: PaginationOptions) {}
```

### Step 4: Generic Utilities

```typescript
// Before: sorting logic duplicated for each entity type
const sortedUsers = users.sort((a, b) => a.name.localeCompare(b.name));
const sortedProducts = products.sort((a, b) => a.name.localeCompare(b.name));

// After
function sortByName<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
}
```

---

## The Rule of Three

Don't abstract until you see duplication **three times**:

1. First time: just write it
2. Second time: note the duplication, consider abstracting
3. Third time: abstract it — the pattern is clear enough

> Premature abstraction is as harmful as duplication.
> A wrong abstraction is harder to remove than duplication.

---

## DRY vs. Wrong Abstraction (The Danger Zone)

Sandi Metz's warning: **"Duplication is far cheaper than the wrong abstraction."**

```typescript
// These look the same — should we DRY them?
function getUserDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
}

function getAuthorDisplayName(author: Author): string {
    return `${author.firstName} ${author.lastName}`;
}

// DON'T merge them into one function that takes a union type
// User and Author will diverge — Author might later show a pen name, middle initial, etc.
// The "duplication" is not knowledge duplication — they model different domain concepts.
```

---

## DRY Checklist

- [ ] Does changing a business rule require modifying more than one file?
- [ ] Are there copy-pasted functions with minor variations?
- [ ] Are there identical or near-identical magic numbers in multiple places?
- [ ] Is the same validation logic scattered across layers (UI, API, DB)?
- [ ] Are there similar data structures defined multiple times independently?

All "no" → DRY is well-applied.
