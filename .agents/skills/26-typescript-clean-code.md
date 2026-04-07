---
name: typescript-clean-code
trigger: "TypeScript clean code, TypeScript best practices, TS types, type safety, strict mode, type design, generics"
---

# TypeScript-Specific Clean Code

> TypeScript's type system is a **design tool**, not just a bug-finder. Use it to encode
> business rules and make illegal states unrepresentable.

---

## Never Use `any`

`any` disables the type system. Every `any` is a lie to the compiler and a time-bomb:

```typescript
// ❌ any defeats the purpose of TypeScript
function processData(data: any): any {
    return data.value.trim(); // no safety — runtime error if data.value is undefined
}

// ✅ Type it properly
function processData(data: { value: string }): string {
    return data.value.trim();
}

// When truly unknown, use `unknown` — forces you to narrow before use
function processUnknown(data: unknown): string {
    if (typeof data === "object" && data !== null && "value" in data) {
        return String((data as { value: unknown }).value).trim();
    }
    throw new Error("Unexpected data shape");
}
```

---

## Prefer `type` Over `interface` for Most Cases

```typescript
// ✅ type for domain models, unions, intersections
type UserId = string & { readonly __brand: unique symbol };
type OrderStatus = "draft" | "placed" | "confirmed" | "cancelled";
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
type UserWithOrders = User & { orders: Order[] };

// ✅ interface when you need declaration merging or OOP extension
interface Repository<T> {
    findById(id: string): Promise<T | null>;
    save(entity: T): Promise<void>;
}

interface OrderRepository extends Repository<Order> {
    findByCustomer(customerId: string): Promise<Order[]>;
}
```

---

## Branded / Opaque Types — Make Illegal States Impossible

```typescript
// ❌ All strings — easy to pass the wrong one
function transferFunds(fromAccount: string, toAccount: string, amount: number): void { ... }
transferFunds(toAccountId, fromAccountId, amount)  // silent bug — IDs swapped!

// ✅ Branded types — compiler prevents the swap
declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

type AccountId = Brand<string, 'AccountId'>
type Amount    = Brand<number, 'Amount'>

function createAccountId(id: string): AccountId { return id as AccountId }
function createAmount(n: number): Amount {
  if (n <= 0) throw new Error('Amount must be positive')
  return n as Amount
}

function transferFunds(from: AccountId, to: AccountId, amount: Amount): void { ... }

// Now this is a COMPILE ERROR:
transferFunds(toAccountId, fromAccountId, amount)  // ← type mismatch caught at compile time
```

---

## Discriminated Unions — Type-Safe State Machines

```typescript
// ❌ Loose types — status field can be inconsistent
interface Order {
    status: string;
    confirmedAt?: Date; // only valid when status === 'confirmed'
    cancelledAt?: Date; // only valid when status === 'cancelled'
    cancellationReason?: string;
}

// ✅ Discriminated union — each state carries only its own relevant data
type Order =
    | { status: "draft"; items: OrderItem[]; customerId: string }
    | {
          status: "placed";
          items: OrderItem[];
          customerId: string;
          placedAt: Date;
      }
    | {
          status: "confirmed";
          items: OrderItem[];
          customerId: string;
          placedAt: Date;
          confirmedAt: Date;
      }
    | {
          status: "cancelled";
          items: OrderItem[];
          customerId: string;
          cancelledAt: Date;
          reason: string;
      };

// TypeScript narrows automatically in exhaustive switch
function getOrderTimestamp(order: Order): Date | null {
    switch (order.status) {
        case "draft":
            return null;
        case "placed":
            return order.placedAt;
        case "confirmed":
            return order.confirmedAt;
        case "cancelled":
            return order.cancelledAt;
    }
}
```

---

## Exhaustive Checks with `never`

```typescript
function assertNever(value: never): never {
    throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

type Shape = "circle" | "square" | "triangle";

function describeShape(shape: Shape): string {
    switch (shape) {
        case "circle":
            return "round";
        case "square":
            return "boxy";
        case "triangle":
            return "pointy";
        default:
            return assertNever(shape); // compile error if a case is missing
    }
}
```

---

## Utility Types for Clean APIs

```typescript
// Pick — expose only what's needed
type UserPreview = Pick<User, 'id' | 'name' | 'avatarUrl'>

// Omit — expose everything except sensitive fields
type PublicUser = Omit<User, 'passwordHash' | 'secretToken'>

// Partial — for update operations
async function updateUser(id: string, updates: Partial<UserProfile>): Promise<User> { ... }

// Required — for validated objects
type ValidatedForm = Required<Pick<UserForm, 'email' | 'name'>>

// Readonly — prevent mutation of returned data
function getConfig(): Readonly<AppConfig> { return config }

// Record — typed key-value maps
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [...adminPermissions],
  editor: [...editorPermissions],
  viewer: [...viewerPermissions],
}
```

---

## Generic Constraints — Precise Without Being Loose

```typescript
// ❌ Unconstrained generic — loses type information
function getProperty<T>(obj: T, key: string): unknown {
    return (obj as any)[key];
}

// ✅ Constrained — type-safe keyof
function getProperty<T extends object, K extends keyof T>(
    obj: T,
    key: K,
): T[K] {
    return obj[key];
}

const user = { id: "1", name: "Siren", age: 25 };
const name = getProperty(user, "name"); // typed as string — not unknown

// ✅ Generic with behavior constraint
function sortBy<T extends Record<K, string | number>, K extends keyof T>(
    items: T[],
    key: K,
): T[] {
    return [...items].sort((a, b) => {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
        return 0;
    });
}
```

---

## Strict Mode — Always On

```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true, // enables all strict flags
        "noUncheckedIndexedAccess": true, // arr[i] returns T | undefined
        "exactOptionalPropertyTypes": true, // strict optional handling
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true
    }
}
```

---

## TypeScript Clean Code Checklist

- [ ] Is `strict: true` enabled in tsconfig?
- [ ] Is `any` used anywhere? If so, is it justified and documented?
- [ ] Are domain concepts modeled with branded types or discriminated unions?
- [ ] Are illegal states truly impossible to represent in the type system?
- [ ] Do all exported functions have explicit return types?
- [ ] Are generics constrained to the minimum necessary?
- [ ] Is `unknown` used instead of `any` for external/unverified data?
