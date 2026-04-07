---
name: typescript-universal
trigger: "typescript clean code, TS best practices, TypeScript patterns, type system design, TS idioms"
---

# TypeScript — Universal Clean Code Guide

> Always use alongside `31-universal-clean-code.md`.
> For SOLID-specific TS patterns see `26-typescript-clean-code.md`.

---

## Strict Mode — Non-Negotiable

```json
// tsconfig.json — bare minimum
{
    "compilerOptions": {
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "exactOptionalPropertyTypes": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "forceConsistentCasingInFileNames": true,
        "moduleResolution": "bundler",
        "target": "ES2022",
        "lib": ["ES2022"]
    }
}
```

---

## Type System Best Practices

### Use `unknown` Not `any` for External Data

```typescript
// ❌ any disables type safety completely
async function fetchData(): Promise<any> { ... }

// ✅ unknown forces you to narrow before use
async function fetchData(): Promise<unknown> { ... }

function processResponse(data: unknown): UserProfile {
  if (!isUserProfile(data)) throw new ParseError('Invalid user profile shape')
  return data
}

// Type guard — keeps narrowing logic in one place
function isUserProfile(v: unknown): v is UserProfile {
  return typeof v === 'object' && v !== null
    && 'id' in v && typeof v.id === 'string'
    && 'email' in v && typeof v.email === 'string'
}
```

### Branded Types for Domain Safety

```typescript
declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

type UserId    = Brand<string, 'UserId'>
type OrderId   = Brand<string, 'OrderId'>
type EmailAddr = Brand<string, 'EmailAddr'>
type Cents     = Brand<number, 'Cents'>

// Now passing wrong ID type is a compile error
function getOrder(id: OrderId): Promise<Order> { ... }
const userId = 'usr-1' as UserId
getOrder(userId)  // ← TYPE ERROR at compile time
```

### Discriminated Unions Over Optional Fields

```typescript
// ❌ Optional fields — which combinations are valid? Unclear.
interface ApiResponse<T> {
    data?: T;
    error?: string;
    isLoading?: boolean;
}

// ✅ Discriminated union — each state is self-contained and valid
type ApiState<T> =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: T }
    | { status: "error"; message: string; code: number };

// Exhaustive narrowing — compiler catches missing cases
function render<T>(state: ApiState<T>): string {
    switch (state.status) {
        case "idle":
            return "Waiting...";
        case "loading":
            return "Loading...";
        case "success":
            return JSON.stringify(state.data);
        case "error":
            return `Error ${state.code}: ${state.message}`;
    }
}
```

### Template Literal Types for String Contracts

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type ApiRoute   = `/api/${string}`
type EventName  = `on${Capitalize<string>}`

function registerHandler(event: EventName, fn: () => void): void { ... }
registerHandler('onClick', fn)    // ✅
registerHandler('click', fn)      // ❌ compile error — must start with 'on'
```

---

## Naming Conventions

```typescript
// Types & Interfaces:   PascalCase
type OrderStatus = 'draft' | 'placed' | 'confirmed'
interface UserRepository { ... }

// Variables/functions:  camelCase
const currentUser = getUser()
function calculateTotal() { ... }

// Constants:            SCREAMING_SNAKE for true globals
const MAX_RETRY_ATTEMPTS = 3
const API_BASE_URL = 'https://api.example.com'

// Files:
// Components     → PascalCase.tsx   (UserCard.tsx)
// Utilities      → camelCase.ts     (formatDate.ts)
// Types          → PascalCase.ts    (OrderTypes.ts) or co-located
// Tests          → *.test.ts / *.spec.ts

// Booleans:       is/has/can/should prefix
const isLoading = true
const hasPermission = false
const canDelete = user.role === 'admin'

// Event handlers: handle prefix
function handleSubmit(e: FormEvent) { ... }
function handleKeyDown(e: KeyboardEvent) { ... }
```

---

## Function Patterns

```typescript
// ✅ Explicit return types on all exported functions
export function parseOrderId(raw: string): OrderId {
  if (!raw.startsWith('ord-')) throw new ValidationError('invalid order ID format')
  return raw as OrderId
}

// ✅ Options object for 3+ parameters
interface CreateUserOptions {
  email: string
  name: string
  role?: UserRole
  sendWelcomeEmail?: boolean
}
export async function createUser(opts: CreateUserOptions): Promise<User> { ... }

// ✅ Function overloads for polymorphic signatures
function formatValue(value: string): string
function formatValue(value: number): string
function formatValue(value: string | number): string {
  return typeof value === 'number' ? value.toFixed(2) : value.trim()
}

// ✅ const assertions for exhaustive maps
const STATUS_LABELS = {
  draft:     'Draft',
  placed:    'Order Placed',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
} as const satisfies Record<OrderStatus, string>
```

---

## Async Patterns

```typescript
// ✅ Always type Promise return explicitly
async function loadUser(id: UserId): Promise<User> { ... }

// ✅ Parallel async with proper typing
async function loadDashboard(userId: UserId): Promise<Dashboard> {
  const [user, orders, notifications] = await Promise.all([
    loadUser(userId),
    loadOrders(userId),
    loadNotifications(userId),
  ])
  return buildDashboard(user, orders, notifications)
}

// ✅ Typed error handling
async function safeLoad<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  try {
    return [await fn(), null]
  } catch (err) {
    return [null, err instanceof Error ? err : new Error(String(err))]
  }
}

const [user, err] = await safeLoad(() => loadUser(id))
if (err) return handleError(err)
// user is typed as User here — not null
```

---

## Module Organization

```typescript
// Feature module structure
src/features/orders/
├── index.ts          ← barrel — only re-exports public API
├── types.ts          ← all types/interfaces for this feature
├── order.service.ts  ← business logic
├── order.repo.ts     ← data access
├── order.schema.ts   ← validation schemas (Zod)
└── order.test.ts     ← tests

// ✅ Barrel only exposes what's needed — never implementation details
// index.ts
export type { Order, OrderId, CreateOrderInput } from './types'
export { OrderService } from './order.service'
// DON'T export: OrderRepository, internal helpers
```

---

## Zod for Runtime Validation

```typescript
import { z } from "zod";

// Schema = source of truth for type AND runtime validation
const CreateOrderSchema = z.object({
    customerId: z.string().min(1),
    items: z
        .array(
            z.object({
                productId: z.string(),
                qty: z.number().int().positive(),
                price: z.number().int().nonnegative(),
            }),
        )
        .nonempty(),
});

// Derive type from schema — single source of truth
type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// Use at API boundary
function handleCreateOrder(raw: unknown): CreateOrderInput {
    return CreateOrderSchema.parse(raw); // throws ZodError with clear message if invalid
}
```

---

## TypeScript Checklist

- [ ] `strict: true` + `noUncheckedIndexedAccess` in tsconfig?
- [ ] Zero `any` — use `unknown` for external data?
- [ ] Domain IDs use branded types?
- [ ] Discriminated unions instead of optional field soup?
- [ ] All exported functions have explicit return types?
- [ ] External data validated with Zod or similar at boundaries?
- [ ] No circular dependencies between modules?
- [ ] Barrel files only expose public API (not internal implementations)?
