---
name: kiss-yagni-principles
trigger: "KISS, YAGNI, keep it simple, you ain't gonna need it, over-engineering, premature optimization, simplicity"
---

# KISS & YAGNI — Simplicity Principles

Two principles that work together to fight the most common engineering disease: **over-engineering**.

---

## KISS — Keep It Simple, Stupid

> **"Simplicity is the ultimate sophistication."**
> — Leonardo da Vinci

The KISS principle states that most systems work best when they are kept simple. Unnecessary
complexity should be actively eliminated.

### What KISS Means in Practice

Complex code is not clever code. It is code that future-you will curse.

```typescript
// ❌ Unnecessarily complex — showing off, not solving
function isEven(n: number): boolean {
    return (n & 1) === 0; // Bitwise hack — "clever" but requires mental translation
}

// ✅ KISS — obvious, readable, correct
function isEven(n: number): boolean {
    return n % 2 === 0;
}
```

```typescript
// ❌ Over-engineered config loader with 5 abstraction layers for a 3-field config
class ConfigurationManagerFactory {
  createConfigurationManager(strategy: ConfigurationStrategy): ConfigurationManager { ... }
}
class ConfigurationManager {
  constructor(private loader: ConfigLoader, private parser: ConfigParser, private validator: ConfigValidator) {}
  load(): Config { ... }
}

// ✅ KISS — just solve the problem
function loadConfig(): Config {
  const raw = readFileSync('./config.json', 'utf-8')
  const parsed = JSON.parse(raw)
  if (!parsed.apiUrl) throw new Error('Missing apiUrl in config')
  return parsed as Config
}
```

### KISS Rules

1. **Solve the actual problem, not the imagined generalized one**
2. **Prefer the boring solution** — well-understood tech over cutting-edge
3. **Fewer moving parts = fewer failure modes**
4. **Ask: "Is there a simpler way to do this?"** before finalizing any design
5. **Complexity must justify its cost** — every abstraction layer must earn its place

### Complexity Checklist

Before adding a new abstraction, pattern, or dependency:

- Does this solve a real problem that exists right now?
- Could we solve it with less code?
- Could a junior developer understand this in 5 minutes?
- Are we abstracting because of actual reuse, or imagined reuse?

---

## YAGNI — You Ain't Gonna Need It

> **"Always implement things when you actually need them, never when you just foresee that
> you need them."**
> — Ron Jeffries (XP co-creator)

YAGNI says: don't build features or abstractions until they are actually required. Every line
of code is a liability — maintenance cost, test surface, cognitive load.

### YAGNI Violations — What They Look Like

```typescript
// ❌ YAGNI — plugin system for a single notification channel
interface NotificationPlugin {
  name: string
  version: string
  initialize(config: PluginConfig): Promise<void>
  send(message: Message): Promise<PluginResult>
  teardown(): Promise<void>
}

class NotificationPluginManager {
  private plugins = new Map<string, NotificationPlugin>()
  register(plugin: NotificationPlugin): void { ... }
  async broadcast(message: Message): Promise<void> { ... }
}

// Reality: there is ONE notification channel. This will never be a "plugin system."
// 200 lines of infrastructure for a future that won't come.

// ✅ YAGNI — just send the email
async function sendEmailNotification(to: string, message: string): Promise<void> {
  await mailer.send({ to, subject: 'Notification', text: message })
}
// If a second channel is ever needed, THEN extract an abstraction. Not before.
```

```typescript
// ❌ YAGNI — generic pagination for a page that shows 5 items and never changes
class PaginationEngine<T> {
  constructor(
    private source: DataSource<T>,
    private pageSize: number,
    private sortStrategy: SortStrategy<T>,
    private filterStrategy: FilterStrategy<T>,
  ) {}

  async getPage(cursor: string): Promise<PaginatedResult<T>> { ... }
}

// ✅ YAGNI — just return the 5 items
async function getRecentNotifications(userId: string): Promise<Notification[]> {
  return db.notifications.findMany({ where: { userId }, take: 5, orderBy: { createdAt: 'desc' } })
}
```

### When to Apply Anticipatory Design (YAGNI Exception)

YAGNI is not "never plan ahead." It applies to **features and capabilities not yet needed**.
You should still:

- Design clean interfaces (makes future extension easy)
- Write tests (safety net for future changes)
- Keep code decoupled (DIP makes future swapping cheap)

The difference: clean architecture enables future changes. YAGNI prevents building those changes
before they're needed.

### The Cost of YAGNI Violations

| Premature Feature           | Real Cost                                      |
| --------------------------- | ---------------------------------------------- |
| Unused plugin system        | 200+ lines to maintain, test, and reason about |
| Premature caching layer     | Stale data bugs, invalidation complexity       |
| Speculative generics        | API ergonomics suffer, less readable           |
| Unused DB fields            | Schema migrations, documentation confusion     |
| "Just in case" config flags | Combinatorial test explosion                   |

---

## KISS + YAGNI Together

They attack the same problem from different angles:

| Principle | Attack Vector                                      |
| --------- | -------------------------------------------------- |
| KISS      | Fights unnecessary **complexity** in existing code |
| YAGNI     | Fights unnecessary **scope** in future features    |

Use them together as a filter: before writing any code, ask:

1. **YAGNI**: Do I need this now?
2. **KISS**: Is this the simplest way to do it?

---

## The Refactoring Safety Net

YAGNI is only safe when you have tests and clean architecture. Without them, you can't safely add
the feature later. The deal is:

- Write YAGNI code now (minimum viable)
- Write tests (so you can safely extend later)
- Keep code clean (so extension is cheap)
- Add the feature when you actually need it
