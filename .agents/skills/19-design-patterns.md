---
name: design-patterns-overview
trigger: "design patterns, GoF patterns, creational patterns, structural patterns, behavioral patterns, pattern catalog"
---

# Design Patterns — Overview & When to Use Them

> **"Design patterns are descriptions of communicating objects and classes that are customized
> to solve a general design problem in a particular context."**
> — Gang of Four, _Design Patterns_ (1994)

Patterns are solutions to recurring problems. They are vocabulary, not recipes — use them when
the problem fits, not to show you know the pattern.

---

## The Three Families

| Family         | Purpose                        | Examples                                                       |
| -------------- | ------------------------------ | -------------------------------------------------------------- |
| **Creational** | Object creation mechanisms     | Factory, Builder, Singleton, Prototype                         |
| **Structural** | Composition of classes/objects | Adapter, Decorator, Facade, Proxy, Composite                   |
| **Behavioral** | Communication between objects  | Strategy, Observer, Command, Chain of Responsibility, Iterator |

---

## Creational Patterns

### Factory Method

**Problem:** Code needs to create objects but shouldn't know the exact class.
**Solution:** Define a method for creating objects; subclasses decide which class to instantiate.

```typescript
interface Logger {
    log(msg: string): void;
}

class ConsoleLogger implements Logger {
    log(msg: string) {
        console.log(msg);
    }
}
class FileLogger implements Logger {
    log(msg: string) {
        writeToFile(msg);
    }
}

// Factory — caller doesn't know or care which logger is returned
function createLogger(env: string): Logger {
    return env === "production" ? new FileLogger() : new ConsoleLogger();
}
```

### Builder

**Problem:** Creating complex objects step-by-step with many optional parameters.
**Solution:** Separate construction from representation.
See `13-classes.md` for full Builder example.

### Singleton

**Problem:** Ensure only one instance of a class exists (database connection pool, config, logger).
**Use carefully** — Singletons introduce global state and make testing hard.

```typescript
// ✅ Module-level singleton (TypeScript's module system guarantees single instance)
// db.ts — first import creates it, all subsequent imports reuse it
export const db = new DatabaseConnection(process.env.DATABASE_URL)

// ❌ Avoid class-based Singleton — it's a global and hard to mock
class DatabaseConnection {
  private static instance: DatabaseConnection
  static getInstance(): DatabaseConnection { ... }
}
```

---

## Structural Patterns

### Adapter

**Problem:** Two incompatible interfaces need to work together.
**Solution:** Wrap the incompatible class in an adapter that translates calls.

```typescript
// Third-party analytics library with its own interface
class GoogleAnalytics {
  trackPageView(path: string, userId: string): void { ... }
}

// Your application expects this interface
interface AnalyticsService {
  recordEvent(event: AnalyticsEvent): void
}

// Adapter bridges them
class GoogleAnalyticsAdapter implements AnalyticsService {
  constructor(private ga: GoogleAnalytics) {}

  recordEvent(event: AnalyticsEvent): void {
    if (event.type === 'pageview') {
      this.ga.trackPageView(event.path, event.userId)
    }
  }
}
```

### Decorator

**Problem:** Add behavior to an object dynamically without subclassing.
**Solution:** Wrap the object in a decorator that adds behavior before/after delegation.

```typescript
interface TextTransformer {
    transform(text: string): string;
}

class PlainText implements TextTransformer {
    transform(text: string): string {
        return text;
    }
}

class UpperCaseDecorator implements TextTransformer {
    constructor(private inner: TextTransformer) {}
    transform(text: string): string {
        return this.inner.transform(text).toUpperCase();
    }
}

class TrimDecorator implements TextTransformer {
    constructor(private inner: TextTransformer) {}
    transform(text: string): string {
        return this.inner.transform(text).trim();
    }
}

// Compose decorators at runtime
const transformer = new UpperCaseDecorator(new TrimDecorator(new PlainText()));
transformer.transform("  hello world  "); // 'HELLO WORLD'
```

### Facade

**Problem:** A complex subsystem is hard to use — many classes with intricate interactions.
**Solution:** Provide a simple, unified interface to the subsystem.

```typescript
// Complex subsystem: video encoding involves many steps
class VideoDecoder { decode(file: Buffer): RawFrames { ... } }
class AudioExtractor { extract(file: Buffer): AudioTrack { ... } }
class FrameProcessor { process(frames: RawFrames): ProcessedFrames { ... } }
class VideoEncoder { encode(frames: ProcessedFrames, audio: AudioTrack): Buffer { ... } }

// Facade — simple interface hides the complexity
class VideoConverter {
  constructor(
    private decoder: VideoDecoder,
    private audio: AudioExtractor,
    private processor: FrameProcessor,
    private encoder: VideoEncoder,
  ) {}

  convert(file: Buffer): Buffer {
    const frames = this.processor.process(this.decoder.decode(file))
    const audio  = this.audio.extract(file)
    return this.encoder.encode(frames, audio)
  }
}
```

### Proxy

**Problem:** Control access to an object (lazy init, access control, caching, logging).
**Solution:** Provide a surrogate that controls access to the real object.

```typescript
interface DataService {
    getData(id: string): Promise<Data>;
}

// Caching proxy
class CachedDataService implements DataService {
    private cache = new Map<string, Data>();

    constructor(private real: DataService) {}

    async getData(id: string): Promise<Data> {
        if (this.cache.has(id)) return this.cache.get(id)!;
        const data = await this.real.getData(id);
        this.cache.set(id, data);
        return data;
    }
}
```

---

## Behavioral Patterns

### Strategy

**Problem:** Multiple algorithms for the same task; need to swap at runtime.
**Solution:** Define a family of algorithms, encapsulate each, make them interchangeable.
See `03-open-closed.md` for full Strategy example.

### Observer / Event Emitter

**Problem:** One object needs to notify many others without tight coupling.
**Solution:** Subjects maintain a list of observers and notify them on state change.

```typescript
type EventHandler<T> = (data: T) => void;

class EventEmitter<Events extends Record<string, unknown>> {
    private listeners = new Map<keyof Events, Set<EventHandler<any>>>();

    on<K extends keyof Events>(
        event: K,
        handler: EventHandler<Events[K]>,
    ): () => void {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(handler);
        return () => this.listeners.get(event)!.delete(handler); // returns unsubscribe fn
    }

    emit<K extends keyof Events>(event: K, data: Events[K]): void {
        this.listeners.get(event)?.forEach((handler) => handler(data));
    }
}

// Usage
type OrderEvents = {
    placed: Order;
    cancelled: { orderId: string; reason: string };
};
const orderBus = new EventEmitter<OrderEvents>();

orderBus.on("placed", (order) => sendConfirmationEmail(order));
orderBus.on("placed", (order) => updateInventory(order));
orderBus.emit("placed", newOrder);
```

### Command

**Problem:** Encapsulate a request as an object (undo/redo, queuing, logging).

```typescript
interface Command {
    execute(): void;
    undo(): void;
}

class MoveCommand implements Command {
    private previousPosition: Point;

    constructor(
        private shape: Shape,
        private delta: Point,
    ) {
        this.previousPosition = shape.position;
    }

    execute(): void {
        this.shape.moveTo(add(this.previousPosition, this.delta));
    }
    undo(): void {
        this.shape.moveTo(this.previousPosition);
    }
}

class CommandHistory {
    private history: Command[] = [];

    execute(cmd: Command): void {
        cmd.execute();
        this.history.push(cmd);
    }
    undo(): void {
        this.history.pop()?.undo();
    }
}
```

---

## Pattern Selection Guide

| Problem                                      | Pattern                           |
| -------------------------------------------- | --------------------------------- |
| Creating objects without knowing exact class | Factory Method / Abstract Factory |
| Complex object with many optional fields     | Builder                           |
| One global resource                          | Module singleton                  |
| Incompatible interfaces                      | Adapter                           |
| Add behavior without subclassing             | Decorator                         |
| Simplify a complex subsystem                 | Facade                            |
| Control access / add cross-cutting concerns  | Proxy                             |
| Swap algorithms at runtime                   | Strategy                          |
| Decouple event producers from consumers      | Observer                          |
| Encapsulate requests (undo/queue)            | Command                           |
| Process items in a chain                     | Chain of Responsibility           |

---

## Anti-Pattern: Pattern for Pattern's Sake

> "If you only have a hammer, everything looks like a nail."

Never apply a pattern just to use it. Ask: does the problem this pattern solves actually exist here?
A simple function is better than a Strategy with one concrete implementation.
