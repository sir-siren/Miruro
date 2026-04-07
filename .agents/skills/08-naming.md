---
name: clean-code-naming
trigger: "naming, variable names, function names, class names, intent-revealing names, bad names, rename"
---

# Clean Code — Naming

> **"There are only two hard things in Computer Science: cache invalidation and naming things."**
> — Phil Karlton

Good names are the single highest-leverage improvement in code readability. A good name
eliminates the need for a comment.

---

## The Golden Rule

**A name should tell you WHY it exists, WHAT it does, and HOW it is used.**

```typescript
// ❌ What is d? What does it measure? What unit?
const d = 86400;

// ✅ Reveals intent, unit, and usage immediately
const SECONDS_PER_DAY = 86_400;

// ❌ What does this do?
function proc(l: number[]): number[];

// ✅ Intent is clear
function filterExpiredItems(items: number[]): number[];
```

---

## The Seven Naming Rules

### 1. Use Intention-Revealing Names

```typescript
// ❌
const yyyymmdstr = moment().format("YYYY/MM/DD");
const list1: number[][] = [];

// ✅
const currentDate = moment().format("YYYY/MM/DD");
const activeAccounts: Account[] = [];
```

### 2. Avoid Disinformation

```typescript
// ❌ accountList is not actually a List — misleading
const accountList = new Map<string, Account>();

// ✅ name matches actual data structure
const accountMap = new Map<string, Account>();
const accounts = new Map<string, Account>(); // also fine — omit type

// ❌ l, O, 0, I, 1 — visually ambiguous
for (let l = 0; l < O; l++) {}

// ✅ clear letters
for (let index = 0; index < count; index++) {}
```

### 3. Make Meaningful Distinctions

```typescript
// ❌ What's the difference between these? Noise words add nothing
getUserInfo()
getUserData()
getUserDetails()
getUser()

// ✅ Distinguish by what actually differs
getAuthenticatedUser()      // returns the logged-in user
getUserById(id: string)     // fetches from DB by ID
getUserProfile(id: string)  // returns public profile data
```

### 4. Use Pronounceable Names

```typescript
// ❌ Try saying this in a code review: "genymdhms"
class DtaRcrd {
    genymdhms: Date;
    modymdhms: Date;
    pszqint: number;
}

// ✅ You can have an actual conversation about this
class CustomerRecord {
    generationTimestamp: Date;
    modificationTimestamp: Date;
    recordId: number;
}
```

### 5. Use Searchable Names

```typescript
// ❌ What does 7 mean here? Good luck grep-ing for it
setTimeout(callback, 7);
if (user.role === 3) {
}

// ✅ Searchable, self-documenting
const POLL_INTERVAL_MS = 7_000;
const USER_ROLE = { ADMIN: 1, EDITOR: 2, VIEWER: 3 } as const;

setTimeout(callback, POLL_INTERVAL_MS);
if (user.role === USER_ROLE.VIEWER) {
}
```

### 6. Avoid Mental Mapping

```typescript
// ❌ r? l? The reader has to keep a mental translation table
const l = locations.length;
for (let r = 0; r < l; r++) {
    doSomething(locations[r]);
}

// ✅ Single-letter variables only acceptable in tiny for-loops (i, j, k)
for (const location of locations) {
    doSomething(location);
}
```

### 7. Don't Add Gratuitous Context

```typescript
// ❌ GSDAccount — everything is already in the GSD namespace
class GSDAccountAddress {}
class GSDAccountUser {}

// ✅ In the GSD module, they're just:
class Address {}
class User {}
```

---

## Naming by Entity Type

### Variables & Constants

```typescript
// Booleans — prefix with is/has/can/should/was
const isLoading: boolean;
const hasPermission: boolean;
const canEdit: boolean;
const shouldRefetch: boolean;

// Arrays — plural nouns
const users: User[];
const orderIds: string[];

// Maps/Sets — describe the relationship
const userById: Map<string, User>;
const permissionsByRole: Map<Role, Permission[]>;

// Constants — SCREAMING_SNAKE for true program constants
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5_000;
```

### Functions

```typescript
// Functions should be verb phrases
calculateTax(order: Order): number
validateEmail(email: string): boolean
fetchUserProfile(userId: string): Promise<UserProfile>
transformToDTO(entity: User): UserDTO

// Event handlers — handle prefix
handleSubmit()
handleKeyDown(event: KeyboardEvent)
handlePaymentSuccess(result: PaymentResult)

// Factories — create/make/build prefix
createSession(credentials: Credentials): Session
buildQueryString(params: Record<string, string>): string
```

### Classes & Types

```typescript
// Classes — PascalCase nouns
class OrderRepository { }
class UserAuthenticator { }
class InvoiceGenerator { }

// TypeScript types/interfaces — PascalCase
type UserId = string
interface UserRepository { findById(id: UserId): Promise<User | null> }

// Generics — single meaningful letter or full word
type Result<T>        // T is conventional for generic type
type Repository<Entity>  // meaningful when context is clear
type Callback<Response>  // prefer full word when domain-specific
```

---

## Anti-Patterns to Ban

| Anti-Pattern                         | Why Bad                          | Fix                                     |
| ------------------------------------ | -------------------------------- | --------------------------------------- |
| `data`, `info`, `stuff`              | Tells nothing                    | Use what the data actually is           |
| `temp`, `tmp`                        | Lazy placeholder                 | Use what it actually holds              |
| `flag`, `check`                      | Too vague                        | Use `isEmailVerified`, `hasWriteAccess` |
| `Manager`, `Handler`, `Processor`    | Often signals SRP violation      | Split into specific classes             |
| Single letters (outside loops)       | Unreadable                       | Always expand                           |
| Abbreviations (`usr`, `acct`, `num`) | Saves 3 chars, costs readability | Spell it out                            |
| Type encoding (`strName`, `iCount`)  | IDEs show types                  | Remove the prefix                       |

---

## The Rename Refactor

When you find a bad name:

1. Use IDE "Rename Symbol" — never find-and-replace manually
2. Rename in a separate commit to keep diffs clean
3. Update tests and docs at the same time

> "The code you write today is the comment for the code you write tomorrow."
