---
name: liskov-substitution-principle
trigger: "LSP, Liskov, subtype, inheritance contract, override behavior, substitutability, polymorphism"
---

# Liskov Substitution Principle (LSP)

> **"Objects of a superclass should be replaceable with objects of its subclasses without
> altering the correctness of the program."**
> — Barbara Liskov (1987)

If `S` is a subtype of `T`, anywhere you use `T` you must be able to use `S` and get the same
behavioral guarantees — not just type-safety, but _behavioral_ correctness.

---

## The Classic Violation — Square/Rectangle

```typescript
class Rectangle {
    constructor(
        protected width: number,
        protected height: number,
    ) {}

    setWidth(w: number): void {
        this.width = w;
    }
    setHeight(h: number): void {
        this.height = h;
    }
    area(): number {
        return this.width * this.height;
    }
}

// ❌ Square "is-a" Rectangle mathematically but VIOLATES LSP behaviorally
class Square extends Rectangle {
    setWidth(w: number): void {
        this.width = w;
        this.height = w;
    } // side effect!
    setHeight(h: number): void {
        this.width = h;
        this.height = h;
    } // side effect!
}

function doubleWidth(rect: Rectangle): void {
    rect.setWidth((rect.area() / rect.height) * 2);
    // Works for Rectangle, produces WRONG result for Square — LSP violation
}
```

```typescript
// ✅ LSP fix — model behavior correctly
interface Shape {
    area(): number;
}

class Rectangle implements Shape {
    constructor(
        private width: number,
        private height: number,
    ) {}
    area(): number {
        return this.width * this.height;
    }
}

class Square implements Shape {
    constructor(private side: number) {}
    area(): number {
        return this.side ** 2;
    }
}
```

---

## The Behavioral Contract

LSP is about **contracts** (preconditions, postconditions, invariants):

| Contract Part          | Rule                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| **Preconditions**      | Subtypes may only WEAKEN preconditions (accept more, not less)      |
| **Postconditions**     | Subtypes may only STRENGTHEN postconditions (return more, not less) |
| **Invariants**         | Subtypes must maintain all invariants of the base type              |
| **History constraint** | Subtype must not allow state mutations that base type prohibits     |

```typescript
abstract class FileReader {
    // Contract: path must exist, returns non-null string
    abstract read(path: string): string;
}

// ❌ Violates LSP — precondition strengthened (only .txt files)
class StrictTextReader extends FileReader {
    read(path: string): string {
        if (!path.endsWith(".txt")) throw new Error("Only .txt allowed"); // STRONGER precondition
        return fs.readFileSync(path, "utf-8");
    }
}

// ✅ LSP-compliant
class BufferedFileReader extends FileReader {
    read(path: string): string {
        // same preconditions
        return fs.readFileSync(path, "utf-8"); // same postconditions
    }
}
```

---

## Tell-Tale Signs of LSP Violations

```typescript
// ❌ Sign 1: Type-checking in polymorphic code
function processShape(shape: Shape): void {
    if (shape instanceof Circle) {
        // special case for Circle — LSP violated, shape hierarchy is broken
    }
}

// ❌ Sign 2: Overriding a method to throw NotImplemented
class ReadOnlyCollection extends Collection {
    add(item: unknown): void {
        throw new Error("This collection is read-only"); // violates Collection's contract
    }
}

// ❌ Sign 3: Empty overrides (doing nothing where parent did something)
class NoOpLogger extends Logger {
    log(msg: string): void {} // silently ignores — callers expect logging to happen
}
```

---

## LSP-Compliant Patterns

### Tell, Don't Ask (via proper subtype behavior)

```typescript
interface NotificationSender {
    send(message: string, recipient: string): Promise<void>;
}

class EmailSender implements NotificationSender {
    async send(message: string, recipient: string): Promise<void> {
        await sendEmail(recipient, message);
    }
}

class SMSSender implements NotificationSender {
    async send(message: string, recipient: string): Promise<void> {
        await sendSMS(recipient, message);
    }
}

// Both are fully substitutable — behavior differs, CONTRACT is identical
async function notify(sender: NotificationSender, msg: string, to: string) {
    await sender.send(msg, to); // works for any NotificationSender
}
```

### Interface Splitting to Enforce LSP

When a subclass refuses to implement a method, the interface is too broad:

```typescript
// ❌ Violation-prone — Bird can't always fly
interface Bird {
    fly(): void;
    eat(): void;
}

class Penguin implements Bird {
    fly(): void {
        throw new Error("Penguins can't fly");
    } // LSP violation
    eat(): void {
        /* ok */
    }
}

// ✅ Segregate behavior correctly (see also ISP)
interface Animal {
    eat(): void;
}
interface FlyingAnimal extends Animal {
    fly(): void;
}

class Penguin implements Animal {
    eat(): void {
        /* ok */
    }
}

class Eagle implements FlyingAnimal {
    eat(): void {
        /* ok */
    }
    fly(): void {
        /* ok */
    }
}
```

---

## LSP and TypeScript

TypeScript's structural typing helps but doesn't guarantee LSP. You must reason about behavior:

```typescript
// Types match ✓ but behavior contract is violated ✗
type Processor = (input: string) => string;
const upperCaseProcessor: Processor = (s) => s.toUpperCase();
const nullProcessor: Processor = (_) => null as unknown as string; // lies about return type

// Use branded types or runtime guards to enforce postconditions
type NonEmptyString = string & { __brand: "NonEmptyString" };

function assertNonEmpty(s: string): NonEmptyString {
    if (s.length === 0) throw new Error("String must not be empty");
    return s as NonEmptyString;
}
```

---

## LSP Checklist

- [ ] Can every subtype be used wherever the parent type is expected without special-casing?
- [ ] Does any subtype throw where the parent wouldn't?
- [ ] Does any subtype accept a narrower range of inputs than the parent?
- [ ] Does any subtype produce weaker output guarantees than the parent?
- [ ] Is there any `instanceof` check in polymorphic code?

All "no" → LSP holds.
