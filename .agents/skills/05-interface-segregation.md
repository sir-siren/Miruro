---
name: interface-segregation-principle
trigger: "ISP, interface segregation, fat interface, clients forced to implement unused methods"
---

# Interface Segregation Principle (ISP)

> **"Clients should not be forced to depend on interfaces they do not use."**
> — Robert C. Martin

Split large "fat" interfaces into smaller, focused ones. Clients only know about the methods they
actually call. This reduces coupling and prevents unnecessary recompilation/change propagation.

---

## The Problem — Fat Interfaces

```typescript
// ❌ Fat interface — forces every implementor to deal with everything
interface Worker {
    work(): void;
    eat(): void; // robots don't eat
    sleep(): void; // robots don't sleep
    getPayroll(): number; // volunteers don't get paid
}

class HumanWorker implements Worker {
    work(): void {
        /* ok */
    }
    eat(): void {
        /* ok */
    }
    sleep(): void {
        /* ok */
    }
    getPayroll(): number {
        return 5000;
    }
}

class RobotWorker implements Worker {
    work(): void {
        /* ok */
    }
    eat(): void {
        throw new Error("Robots do not eat");
    } // forced, wrong
    sleep(): void {
        throw new Error("Robots do not sleep");
    } // forced, wrong
    getPayroll(): number {
        return 0;
    } // meaningless
}
```

---

## The Fix — Segregated Interfaces

```typescript
// ✅ Split by client need
interface Workable {
    work(): void;
}
interface Feedable {
    eat(): void;
}
interface Restable {
    sleep(): void;
}
interface Compensatable {
    getPayroll(): number;
}

class HumanWorker implements Workable, Feedable, Restable, Compensatable {
    work(): void {
        /* ok */
    }
    eat(): void {
        /* ok */
    }
    sleep(): void {
        /* ok */
    }
    getPayroll(): number {
        return 5000;
    }
}

class RobotWorker implements Workable {
    work(): void {
        /* only what it actually does */
    }
}

class Volunteer implements Workable, Feedable, Restable {
    work(): void {
        /* ok */
    }
    eat(): void {
        /* ok */
    }
    sleep(): void {
        /* ok */
    }
    // No getPayroll — not forced to implement something meaningless
}
```

---

## ISP in Real TypeScript Codebases

### Example: Repository Pattern

```typescript
// ❌ One interface forces every repo to implement all CRUD
interface Repository<T> {
  findAll(): Promise<T[]>
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<void>
  delete(id: string): Promise<void>
  count(): Promise<number>
  findByQuery(query: Record<string, unknown>): Promise<T[]>
  bulkInsert(entities: T[]): Promise<void>
}

// ✅ Composable role interfaces
interface Readable<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
}

interface Writable<T> {
  save(entity: T): Promise<void>
}

interface Deletable {
  delete(id: string): Promise<void>
}

interface Queryable<T> {
  findByQuery(query: Record<string, unknown>): Promise<T[]>
}

// Assemble only what each repo needs
class ReadOnlyAuditLogRepo implements Readable<AuditLog> { ... }
class UserRepo implements Readable<User>, Writable<User>, Deletable { ... }
class ProductRepo implements Readable<Product>, Writable<Product>, Queryable<Product> { ... }
```

### Example: Service Interfaces for Testing

```typescript
// Client only needs to send notifications — doesn't care about subscription management
interface NotificationSender {
    send(userId: string, message: string): Promise<void>;
}

// Admin panel needs full control
interface NotificationService extends NotificationSender {
    subscribe(userId: string, topic: string): Promise<void>;
    unsubscribe(userId: string, topic: string): Promise<void>;
    getPreferences(userId: string): Promise<NotificationPrefs>;
}

// OrderService depends on narrow interface → easy to mock
class OrderService {
    constructor(private notifier: NotificationSender) {} // not the full service

    async confirmOrder(order: Order): Promise<void> {
        await this.notifier.send(order.userId, `Order ${order.id} confirmed`);
    }
}
```

---

## ISP at the Function Level

ISP applies to function parameters too — don't force callers to construct massive objects:

```typescript
// ❌ Forces caller to construct full User just to get display name
function getDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
}

// ✅ Only depends on what it needs — easier to test and compose
function getDisplayName(person: {
    firstName: string;
    lastName: string;
}): string {
    return `${person.firstName} ${person.lastName}`;
}
```

---

## ISP and TypeScript Discriminated Unions

```typescript
// ❌ Union type with methods some variants can't fulfill
type Shape =
  | { kind: 'circle'; radius: number; getVolume(): number }     // 2D shape has no volume
  | { kind: 'sphere'; radius: number; getVolume(): number }

// ✅ Keep interfaces true to what each type actually supports
interface Measurable2D  { area(): number; perimeter(): number }
interface Measurable3D  { volume(): number; surfaceArea(): number }

class Circle  implements Measurable2D  { ... }
class Sphere  implements Measurable3D  { ... }
class Cylinder implements Measurable2D, Measurable3D { ... }
```

---

## Granularity — How Small is Too Small?

| Too Fine                               | Just Right                                    | Too Coarse                                     |
| -------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `interface HasId { id: string }` alone | `interface Readable<T> { findById, findAll }` | `interface FullRepository<T>` with 10+ methods |
| Single-property interfaces everywhere  | Role interfaces per use case                  | One mega-interface per domain                  |

**Rule of thumb:** Group methods that are always called together by the same client.

---

## ISP Checklist

- [ ] Does any implementor throw `NotImplemented` for interface methods it doesn't support?
- [ ] Are there methods in the interface that only some consumers use?
- [ ] When you change one unrelated method's signature, does it force unrelated classes to update?
- [ ] Are test mocks painful to create because of the size of the interface?

All "no" → ISP is healthy.
