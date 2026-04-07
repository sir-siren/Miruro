---
name: refactoring-techniques
trigger: "refactoring, refactor, extract method, rename, move, inline, decompose, improve code without changing behavior"
---

# Refactoring Techniques

> **"Refactoring is the process of changing a software system in such a way that it does not
> alter the external behavior of the code yet improves its internal structure."**
> — Martin Fowler, _Refactoring_ (1999, 2nd ed. 2018)

Refactoring is not rewriting. It is a series of small, safe, behavior-preserving transformations.
Each step is tiny. The cumulative effect is dramatic.

---

## The Refactoring Rhythm

1. **Run tests** — verify starting state is green
2. **Make one small change** — one refactoring at a time
3. **Run tests** — verify still green
4. **Commit** — checkpoint before next change
5. Repeat

Never refactor and add features at the same time. Two separate commits.

---

## Composing Methods

### Extract Method (Most Used Refactoring)

Pull a code fragment into its own named function:

```typescript
// Before
function printOwing(invoice: Invoice): void {
    // print banner
    console.log("***********************");
    console.log("***** Customer Owes ****");
    console.log("***********************");

    // calculate outstanding
    let outstanding = 0;
    for (const order of invoice.orders) {
        outstanding += order.amount;
    }

    // print details
    console.log(`name: ${invoice.customer}`);
    console.log(`amount: ${outstanding}`);
}

// After
function printOwing(invoice: Invoice): void {
    printBanner();
    const outstanding = calculateOutstanding(invoice);
    printDetails(invoice, outstanding);
}

function printBanner(): void {
    console.log("***********************");
    console.log("***** Customer Owes ****");
    console.log("***********************");
}

function calculateOutstanding(invoice: Invoice): number {
    return invoice.orders.reduce((sum, order) => sum + order.amount, 0);
}

function printDetails(invoice: Invoice, outstanding: number): void {
    console.log(`name: ${invoice.customer}`);
    console.log(`amount: ${outstanding}`);
}
```

### Inline Method

When a method body is as clear as its name, inline it:

```typescript
// Before — the indirection adds no clarity
function getRating(driver: Driver): number {
    return moreThanFiveLateDeliveries(driver) ? 2 : 1;
}
function moreThanFiveLateDeliveries(driver: Driver): boolean {
    return driver.lateDeliveries > 5;
}

// After — direct is clearer here
function getRating(driver: Driver): number {
    return driver.lateDeliveries > 5 ? 2 : 1;
}
```

### Replace Temp with Query

```typescript
// Before
function getPrice(quantity: number, itemPrice: number): number {
    const basePrice = quantity * itemPrice;
    const discountFactor = basePrice > 1000 ? 0.95 : 0.98;
    return basePrice * discountFactor;
}

// After — temp vars extracted to named queries
function getPrice(quantity: number, itemPrice: number): number {
    return basePrice(quantity, itemPrice) * discountFactor(quantity, itemPrice);
}

function basePrice(quantity: number, price: number): number {
    return quantity * price;
}
function discountFactor(quantity: number, price: number): number {
    return basePrice(quantity, price) > 1_000 ? 0.95 : 0.98;
}
```

---

## Moving Features Between Objects

### Move Method

When a method uses more data from another class than its own:

```typescript
// Before — AccountCharge.overdraftCharge() uses Account's data
class AccountCharge {
    overdraftCharge(account: Account): number {
        if (account.type.isPremium()) {
            const base = 10;
            return account.daysOverdrawn > 7
                ? base + (account.daysOverdrawn - 7) * 0.85
                : base;
        }
        return account.daysOverdrawn * 1.75;
    }
}

// After — move to Account where the data lives
class Account {
    overdraftCharge(): number {
        if (this.type.isPremium()) {
            const base = 10;
            return this.daysOverdrawn > 7
                ? base + (this.daysOverdrawn - 7) * 0.85
                : base;
        }
        return this.daysOverdrawn * 1.75;
    }
}
```

### Extract Class

When one class is doing two classes' jobs:

```typescript
// Before — Person handles both personal info and phone formatting
class Person {
    name: string;
    officeAreaCode: string;
    officeNumber: string;

    getTelephoneNumber(): string {
        return `(${this.officeAreaCode}) ${this.officeNumber}`;
    }
}

// After
class TelephoneNumber {
    constructor(
        readonly areaCode: string,
        readonly number: string,
    ) {}
    toString(): string {
        return `(${this.areaCode}) ${this.number}`;
    }
}

class Person {
    name: string;
    officeTelephone: TelephoneNumber;

    getTelephoneNumber(): string {
        return this.officeTelephone.toString();
    }
}
```

---

## Organizing Data

### Replace Primitive with Object (Value Object)

```typescript
// Before — 'priority' is just a string but has behavior
class Order {
    priority: string; // 'low' | 'medium' | 'high' — with comparison logic scattered around
}

// After — Priority is a proper value object
class Priority {
    private static readonly VALUES = ["low", "normal", "high", "rush"] as const;

    constructor(private readonly value: string) {
        if (!Priority.VALUES.includes(value as any)) {
            throw new Error(`Invalid priority: ${value}`);
        }
    }

    higherThan(other: Priority): boolean {
        return (
            Priority.VALUES.indexOf(this.value as any) >
            Priority.VALUES.indexOf(other.value as any)
        );
    }

    toString(): string {
        return this.value;
    }
}

class Order {
    priority: Priority;
}
```

### Replace Magic Number with Symbolic Constant

```typescript
// Before
if (employee.seniority < 2) { ... }
if (machine.voltage > 220) { ... }

// After
const PROBATION_PERIOD_YEARS = 2
const MAX_SAFE_VOLTAGE = 220

if (employee.seniority < PROBATION_PERIOD_YEARS) { ... }
if (machine.voltage > MAX_SAFE_VOLTAGE) { ... }
```

---

## Simplifying Conditional Expressions

### Decompose Conditional

```typescript
// Before
if (!date.isBefore(SUMMER_START) && !date.isAfter(SUMMER_END)) {
    charge = quantity * summerRate;
} else {
    charge = quantity * regularRate + regularServiceCharge;
}

// After — names communicate intent
if (isSummer(date)) {
    charge = summerCharge(quantity);
} else {
    charge = regularCharge(quantity);
}

function isSummer(date: Date): boolean {
    return !date.isBefore(SUMMER_START) && !date.isAfter(SUMMER_END);
}
```

### Replace Nested Conditional with Guard Clauses

```typescript
// Before — deep nesting, hard to follow happy path
function getPayAmount(employee: Employee): number {
    let result: number;
    if (employee.isSeparated) {
        result = separatedAmount(employee);
    } else {
        if (employee.isRetired) {
            result = retiredAmount(employee);
        } else {
            result = normalPayAmount(employee);
        }
    }
    return result;
}

// After — early returns flatten nesting, happy path is at the bottom
function getPayAmount(employee: Employee): number {
    if (employee.isSeparated) return separatedAmount(employee);
    if (employee.isRetired) return retiredAmount(employee);
    return normalPayAmount(employee);
}
```

### Replace Conditional with Polymorphism

See `03-open-closed.md` for full treatment.

---

## Refactoring Safely

### IDE-Assisted Refactoring

Always use IDE rename/move/extract — never find-and-replace:

- **Rename Symbol** — renames all references across the codebase
- **Extract Method** — available in VS Code, WebStorm, etc.
- **Move to File** — safely relocates declarations

### Micro-Commit Strategy

```bash
# Each refactoring is its own commit — easy to revert if something breaks
git commit -m "refactor: extract calculateOutstanding() from printOwing()"
git commit -m "refactor: move overdraftCharge() to Account class"
git commit -m "refactor: replace magic number 5 with MAX_LATE_DELIVERIES"
```

---

## Refactoring Catalog Quick Reference

| Smell                 | Refactoring                                   |
| --------------------- | --------------------------------------------- |
| Long Method           | Extract Method                                |
| Temp variable         | Replace Temp with Query                       |
| Feature Envy          | Move Method                                   |
| Large Class           | Extract Class                                 |
| Magic Number          | Replace with Constant                         |
| Deep nesting          | Replace Nested Conditional with Guard Clauses |
| Type-switch           | Replace Conditional with Polymorphism         |
| Primitive for concept | Replace Primitive with Object                 |
| Too many parameters   | Introduce Parameter Object                    |
| Duplicate code        | Extract Method + Pull Up                      |
