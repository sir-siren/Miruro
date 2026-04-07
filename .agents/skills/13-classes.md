---
name: clean-code-classes
trigger: "classes, cohesion, class design, encapsulation, class size, OOP class principles"
---

# Clean Code — Classes

> **"The first rule of classes is that they should be small. The second rule of classes is that
> they should be smaller than that."**
> — Robert C. Martin

A well-designed class is a single, cohesive unit of responsibility with high internal cohesion and
low external coupling.

---

## Class Organization

The standard order within a class (top-down):

```typescript
class WellOrganizedClass {
    // 1. Static constants
    static readonly MAX_SIZE = 100;

    // 2. Static fields
    private static instanceCount = 0;

    // 3. Instance fields (private first, then protected, then public)
    private readonly id: string;
    private name: string;

    // 4. Constructors
    constructor(name: string) {
        this.id = crypto.randomUUID();
        this.name = name;
        WellOrganizedClass.instanceCount++;
    }

    // 5. Static factory methods
    static create(name: string): WellOrganizedClass {
        return new WellOrganizedClass(name);
    }

    // 6. Public methods (high-level operations first)
    rename(newName: string): void {
        this.validateName(newName);
        this.name = newName;
    }

    // 7. Private helpers (called by public methods above)
    private validateName(name: string): void {
        if (name.trim().length === 0) throw new Error("Name cannot be empty");
    }
}
```

---

## The Cohesion Metric

A class is **highly cohesive** when most methods use most of the instance variables.
Low cohesion signals the class should be split.

```typescript
// ❌ Low cohesion — methods don't share fields. Two classes in disguise.
class UserOrderManager {
    private userId: string; // used only by user methods
    private userName: string; // used only by user methods
    private orderId: string; // used only by order methods
    private orderTotal: number; // used only by order methods

    getUserProfile(): UserProfile {
        return { id: this.userId, name: this.userName };
    }
    updateUserName(name: string): void {
        this.userName = name;
    }

    getOrderTotal(): number {
        return this.orderTotal;
    }
    applyDiscount(pct: number): void {
        this.orderTotal *= 1 - pct;
    }
}

// ✅ Split by cohesion
class User {
    constructor(
        private id: string,
        private name: string,
    ) {}
    getProfile(): UserProfile {
        return { id: this.id, name: this.name };
    }
    rename(name: string): void {
        this.name = name;
    }
}

class Order {
    constructor(
        private id: string,
        private total: number,
    ) {}
    getTotal(): number {
        return this.total;
    }
    applyDiscount(pct: number): void {
        this.total *= 1 - pct;
    }
}
```

---

## Encapsulation — Don't Expose What You Don't Have To

```typescript
// ❌ Exposing internals invites misuse and makes refactoring hard
class BankAccount {
    public balance: number = 0; // direct mutation allowed by callers
    public transactions: Transaction[] = []; // direct push allowed
}

account.balance -= 1000; // caller bypasses business rules
account.transactions.push(fraudTransaction); // bypasses validation

// ✅ Controlled access through behavior
class BankAccount {
    private _balance: number = 0;
    private _transactions: Transaction[] = [];

    get balance(): number {
        return this._balance;
    }
    get transactionHistory(): readonly Transaction[] {
        return [...this._transactions];
    }

    deposit(amount: number): void {
        if (amount <= 0) throw new Error("Deposit amount must be positive");
        this._balance += amount;
        this._transactions.push({ type: "deposit", amount, date: new Date() });
    }

    withdraw(amount: number): void {
        if (amount > this._balance) throw new InsufficientFundsError();
        this._balance -= amount;
        this._transactions.push({
            type: "withdrawal",
            amount,
            date: new Date(),
        });
    }
}
```

---

## Classes Should Be Small — Measuring by Responsibilities

Unlike functions (measured in lines), classes are measured by **responsibilities**:

```typescript
// ❌ One class, 5 responsibilities
class Application {
  parseConfig() { }      // Config responsibility
  connectDatabase() { }  // DB responsibility
  setupRoutes() { }      // HTTP responsibility
  startServer() { }      // Server responsibility
  setupLogging() { }     // Logging responsibility
}

// ✅ Each class has one responsibility
class ConfigLoader { load(): AppConfig { ... } }
class DatabaseConnector { connect(config: DBConfig): Connection { ... } }
class RouteRegistry { register(app: Express): void { ... } }
class ServerBootstrap {
  constructor(
    private config: ConfigLoader,
    private db: DatabaseConnector,
    private routes: RouteRegistry,
  ) {}

  async start(): Promise<void> {
    const config = this.config.load()
    await this.db.connect(config.db)
    this.routes.register(app)
    app.listen(config.port)
  }
}
```

---

## Favor Composition Over Inheritance

Inheritance is a strong coupling. Composition is more flexible:

```typescript
// ❌ Deep inheritance — rigid, hard to test, Liskov traps
class Animal {
    breathe() {}
}
class Pet extends Animal {
    befriendHuman() {}
}
class Dog extends Pet {
    bark() {}
}
class GuideDog extends Dog {
    guide() {}
}

// ✅ Composed from behaviors
interface Breathable {
    breathe(): void;
}
interface Trainable {
    train(command: string): void;
}
interface Guidable {
    guide(person: Person): void;
}

class GuideDog implements Breathable, Trainable, Guidable {
    private breather = new LungBreather();
    private trainer = new DogTrainer();
    private guide_ = new PathGuide();

    breathe() {
        this.breather.breathe();
    }
    train(cmd: string) {
        this.trainer.train(cmd);
    }
    guide(person: Person) {
        this.guide_.guide(person);
    }
}
```

---

## Class Size Guidelines

| Metric                 | Guideline                  |
| ---------------------- | -------------------------- |
| Lines                  | < 200 (hard limit 300)     |
| Public methods         | < 10                       |
| Instance variables     | < 7                        |
| Constructor parameters | ≤ 4 (use Builder for more) |
| Inheritance depth      | ≤ 3 levels                 |

---

## The Builder Pattern for Complex Construction

When a class legitimately needs many fields, use a Builder instead of a giant constructor:

```typescript
class HttpRequest {
    private constructor(
        readonly url: string,
        readonly method: string,
        readonly headers: Record<string, string>,
        readonly body: string | null,
        readonly timeout: number,
    ) {}

    static builder(url: string): HttpRequestBuilder {
        return new HttpRequestBuilder(url);
    }
}

class HttpRequestBuilder {
    private method = "GET";
    private headers: Record<string, string> = {};
    private body: string | null = null;
    private timeout = 5_000;

    constructor(private url: string) {}

    withMethod(method: string): this {
        this.method = method;
        return this;
    }
    withHeader(key: string, value: string): this {
        this.headers[key] = value;
        return this;
    }
    withBody(body: string): this {
        this.body = body;
        return this;
    }
    withTimeout(ms: number): this {
        this.timeout = ms;
        return this;
    }

    build(): HttpRequest {
        return new (HttpRequest as any)(
            this.url,
            this.method,
            this.headers,
            this.body,
            this.timeout,
        );
    }
}

const req = HttpRequest.builder("https://api.example.com/users")
    .withMethod("POST")
    .withHeader("Content-Type", "application/json")
    .withBody(JSON.stringify({ name: "Siren" }))
    .withTimeout(10_000)
    .build();
```
