---
name: zig-clean-code
trigger: "Zig clean code, Zig best practices, Zig idioms, Zig error handling, comptime, Zig patterns"
---

# Zig — Clean Code Guide

> Always load alongside `31-universal-clean-code.md`.
> Zig version: 0.13+ (stable).

---

## The Zig Philosophy

> "No hidden control flow. No hidden allocations. No operator overloading.
> No implicit conversions. Communicate intent explicitly."

Zig is about **explicit control**. Every allocation is visible. Every possible failure is visible.
Every branch is visible. Clean Zig amplifies this — the code tells the whole story.

---

## Naming Conventions

```zig
// Types (structs, enums, unions, error sets): PascalCase
const OrderStatus = enum { draft, placed, confirmed, cancelled };
const Order = struct { ... };
const ParseError = error { InvalidFormat, UnexpectedEnd };

// Functions, methods, variables: camelCase
fn calculateTotal(items: []const OrderItem) u64 { }
fn parseOrderId(raw: []const u8) !OrderId { }
var pendingOrders = std.ArrayList(Order).init(allocator);

// Constants: camelCase (same as vars — Zig doesn't distinguish)
const maxRetryAttempts: u32 = 3;
const defaultTimeoutMs: u64 = 5_000;

// Struct fields: camelCase
const User = struct {
    id: UserId,
    email: []const u8,
    createdAt: i64,
};
```

---

## Error Handling — Zig's Explicit Model

Zig has NO exceptions. Every error is a value. Every function that can fail returns an error union.

```zig
// ✅ Error sets — exhaustive, typed
const ConfigError = error{
    FileNotFound,
    InvalidToml,
    MissingField,
};

// ✅ Error union return type: !T means `ConfigError!Config` (inferred error set)
fn loadConfig(path: []const u8) !Config {
    const file = try std.fs.cwd().openFile(path, .{});  // try propagates error up
    defer file.close();

    const content = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(content);

    return parseConfig(content);  // returns ConfigError or Config
}

// ✅ try vs catch — choose based on whether you can recover
fn run() !void {
    // try: propagate — you can't handle this here
    const config = try loadConfig("config.toml");

    // catch: handle — you CAN recover here
    const port = std.fmt.parseInt(u16, config.port, 10) catch |err| {
        std.log.warn("invalid port {s}, using default: {}", .{ config.port, err });
        break :blk 8080;  // default value
    };
}

// ✅ catch with switch for exhaustive handling
const result = parseValue(raw) catch |err| switch (err) {
    error.InvalidFormat   => return error.BadInput,
    error.UnexpectedEnd   => return null,
    error.OutOfMemory     => return error.OutOfMemory,
};
```

---

## Memory Management — Explicit Allocators

Zig has no GC and no hidden allocations. Every allocation is explicit and owned.

```zig
// ✅ Pass allocator as parameter — functions don't own an allocator
// The CALLER decides the allocation strategy
fn readLines(allocator: std.mem.Allocator, path: []const u8) ![][]const u8 {
    const file = try std.fs.cwd().openFile(path, .{});
    defer file.close();

    var lines = std.ArrayList([]const u8).init(allocator);
    errdefer {
        for (lines.items) |line| allocator.free(line);
        lines.deinit();
    }

    // ... read lines, appending to list
    return try lines.toOwnedSlice();
}

// ✅ defer for cleanup — always paired with allocation
const buf = try allocator.alloc(u8, 4096);
defer allocator.free(buf);

// ✅ errdefer for cleanup on error path only
const result = try allocator.create(Node);
errdefer allocator.destroy(result);  // only runs if the rest of the function errors

// ✅ ArenaAllocator for lifetime-grouped allocations (e.g., per-request)
var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
defer arena.deinit();  // frees everything at once
const alloc = arena.allocator();
```

---

## Structs and Methods

```zig
// ✅ Methods via namespace — Zig's approach to OOP
const Order = struct {
    id: OrderId,
    status: OrderStatus,
    items: []const OrderItem,
    allocator: std.mem.Allocator,

    // Constructor — caller manages memory
    pub fn init(
        allocator: std.mem.Allocator,
        id: OrderId,
        items: []const OrderItem,
    ) !Order {
        const owned_items = try allocator.dupe(OrderItem, items);
        return Order{
            .id = id,
            .status = .draft,
            .items = owned_items,
            .allocator = allocator,
        };
    }

    // Destructor — always paired with init
    pub fn deinit(self: *Order) void {
        self.allocator.free(self.items);
    }

    // Methods via `self` parameter
    pub fn calculateTotal(self: Order) u64 {
        var total: u64 = 0;
        for (self.items) |item| {
            total += item.price * item.qty;
        }
        return total;
    }

    pub fn confirm(self: *Order) !void {
        if (self.status != .draft and self.status != .placed) {
            return error.InvalidStatusTransition;
        }
        self.status = .confirmed;
    }
};

// Usage
var order = try Order.init(allocator, id, items);
defer order.deinit();

try order.confirm();
const total = order.calculateTotal();
```

---

## Comptime — The Killer Feature

`comptime` moves computation to compile time. Use it for zero-cost generics and metaprogramming.

```zig
// ✅ Comptime generics — like Rust generics but more flexible
fn Stack(comptime T: type) type {
    return struct {
        items: std.ArrayList(T),
        allocator: std.mem.Allocator,

        const Self = @This();

        pub fn init(allocator: std.mem.Allocator) Self {
            return Self{ .items = std.ArrayList(T).init(allocator), .allocator = allocator };
        }

        pub fn push(self: *Self, item: T) !void {
            try self.items.append(item);
        }

        pub fn pop(self: *Self) ?T {
            return if (self.items.items.len > 0) self.items.pop() else null;
        }
    };
}

var intStack = Stack(i32).init(allocator);
defer intStack.items.deinit();
try intStack.push(42);

// ✅ Comptime for static assertions — catch bugs at compile time
fn assertSupportedType(comptime T: type) void {
    comptime {
        switch (@typeInfo(T)) {
            .Int, .Float => {},
            else => @compileError("Type " ++ @typeName(T) ++ " is not supported"),
        }
    }
}
```

---

## Slices Over Pointers

```zig
// ✅ Slices carry length — safer than raw pointers
fn sumSlice(items: []const u32) u64 {
    var total: u64 = 0;
    for (items) |item| total += item;
    return total;
}

// ✅ Sentinel-terminated slices for C interop
fn printCString(s: [*:0]const u8) void {
    std.debug.print("{s}\n", .{s});
}

// ✅ Const slices for read-only views — no copying
fn logItems(items: []const Item) void {
    for (items, 0..) |item, i| {
        std.log.info("[{d}] {s}", .{ i, item.name });
    }
}
```

---

## Unions for Type-Safe Variants

```zig
// ✅ Tagged union — Zig's discriminated union (like Rust enum)
const Expr = union(enum) {
    number: f64,
    string: []const u8,
    boolean: bool,
    null_value,

    pub fn typeName(self: Expr) []const u8 {
        return switch (self) {
            .number  => "number",
            .string  => "string",
            .boolean => "boolean",
            .null_value => "null",
        };
    }
};

// Pattern matching is exhaustive — missing case = compile error
fn evaluate(expr: Expr) void {
    switch (expr) {
        .number  => |n| std.debug.print("num: {d}\n", .{n}),
        .string  => |s| std.debug.print("str: {s}\n", .{s}),
        .boolean => |b| std.debug.print("bool: {}\n", .{b}),
        .null_value  => std.debug.print("null\n", .{}),
    }
}
```

---

## Zig Clean Code Checklist

- [ ] Every error propagated with `try` or handled with `catch`?
- [ ] Every `alloc` paired with a `defer free` or `errdefer free`?
- [ ] Allocator passed as parameter — not stored as global?
- [ ] Tagged unions used instead of fragile type-erasure?
- [ ] `comptime` used to eliminate runtime type checks where possible?
- [ ] Slices used instead of pointer + length pairs?
- [ ] `pub` applied only to genuinely public API — private by default?
- [ ] `zig fmt` run on all files?
