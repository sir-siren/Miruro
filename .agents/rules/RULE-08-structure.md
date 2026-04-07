---
name: RULE-08-STRUCTURE-FORMATTING
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-08 — Code Structure & Formatting

> **AI DIRECTIVE: Code structure is communication. Every layout decision sends a signal
> to the reader. Structure code so it reads top-to-bottom like a well-organized newspaper:
> headline first, details below, related things close together.**

---

## Rule 8.1 — The Newspaper Metaphor

A source file reads like a newspaper article:

- **Top**: high-level concept, exported API, public interface
- **Middle**: orchestration, medium-level detail
- **Bottom**: low-level helpers, private implementation details

```
// File layout order (apply to any language):
1. Module docstring / top-level copyright (if required)
2. Imports (grouped: stdlib → external → internal → relative)
3. Constants and types
4. Main exported class/function (high-level)
5. Supporting classes/functions (called by the above)
6. Private/internal helpers (lowest level, called last)
```

---

## Rule 8.2 — Vertical Openness — Blank Lines as Paragraph Breaks

Use blank lines to separate **logically distinct concepts**. Code with no vertical space
is a wall of text. Group lines that work together; separate groups with blank lines.

```
// WRONG — no visual separation
import {A} from './a'
import {B} from './b'
const MAX = 100
const MIN = 0
class Service {
  constructor(private a: A, private b: B) {}
  doWork(): void {
    const x = this.a.fetch()
    const y = this.b.transform(x)
    this.save(y)
  }
  private save(y: any) { ... }
}

// CORRECT — blank lines create visual paragraphs
import { A } from './a'
import { B } from './b'

const MAX = 100
const MIN = 0

class Service {
  constructor(
    private readonly a: A,
    private readonly b: B,
  ) {}

  doWork(): void {
    const raw       = this.a.fetch()
    const processed = this.b.transform(raw)

    this.save(processed)
  }

  private save(data: ProcessedData): void { ... }
}
```

---

## Rule 8.3 — Caller Above Callee (Top-Down Reading Order)

Functions that call other functions should appear **above** the functions they call.
The file reads top-to-bottom like a story.

```
// CORRECT — callers come first, callees below
function generateReport(data) {           // 1. high-level entry point
    const sections = buildSections(data)  // calls 2
    const summary  = buildSummary(data)   // calls 3
    return assemble(sections, summary)    // calls 4
}

function buildSections(data) { ... }      // 2. called by generateReport
function buildSummary(data) { ... }       // 3. called by generateReport
function assemble(sections, summary) { ... }  // 4. called by generateReport
```

---

## Rule 8.4 — Line Length

- **Target**: ≤ 100 characters per line
- **Hard limit**: ≤ 120 characters
- Never sacrifice readability to stay on one line

```
// WRONG — horizontal scrolling required
const result = await database.orders.findAll({ where: { isActive: true, status: 'confirmed', customerId: userId }, orderBy: { createdAt: 'desc' } })

// CORRECT — wrapped at logical boundaries
const result = await database.orders.findAll({
    where: {
        isActive:   true,
        status:     'confirmed',
        customerId: userId,
    },
    orderBy: { createdAt: 'desc' },
})
```

---

## Rule 8.5 — Consistent Indentation

- Use the language's standard (2 spaces for JS/TS, 4 spaces for Rust/Python/Go, tabs for Go)
- **Never mix tabs and spaces**
- Configure a formatter and commit its config — formatting must be automated, not manual

| Language | Tool                    | Config file      |
| -------- | ----------------------- | ---------------- |
| JS/TS    | Prettier                | `.prettierrc`    |
| Rust     | `rustfmt`               | `rustfmt.toml`   |
| Go       | `gofmt` (built-in)      | automatic        |
| Python   | `ruff format` / `black` | `pyproject.toml` |
| Zig      | `zig fmt` (built-in)    | automatic        |

---

## Rule 8.6 — Import Organization

Imports must be grouped and ordered. The AI must generate them correctly:

```
// Universal group order:
// 1. Language standard library / built-ins
// 2. External third-party packages
// 3. Internal project packages (absolute paths)
// 4. Relative imports (same feature/module)

// Blank line between each group.

// JS/TS example:
import { readFile } from 'node:fs/promises'   // 1. stdlib

import { z } from 'zod'                        // 2. external
import express from 'express'

import { OrderService } from '@/services'      // 3. internal
import { logger } from '@/lib/logger'

import { buildOrder } from './test-helpers'    // 4. relative
```

---

## Rule 8.7 — Variable Declaration Proximity

Declare variables as close to their first use as possible.
Don't declare all variables at the top of a function.

```
// WRONG — variables declared far from use
function processOrder(order) {
    let total, discountRate, finalPrice, tax  // declared at top
    // ... 20 lines of code ...
    total = calculateBase(order)
    // ... more code ...
    discountRate = getRate(order.customer)    // finally used
}

// CORRECT — each declared just before use
function processOrder(order) {
    // ... validation ...
    const total        = calculateBase(order)
    const discountRate = getRate(order.customer)
    const finalPrice   = total * (1 - discountRate)
    const tax          = calculateTax(finalPrice)
    return { total: finalPrice + tax }
}
```

---

## Rule 8.8 — No Horizontal Alignment

Horizontal alignment of assignments looks pretty but creates noisy diffs and fragile maintenance:

```
// WRONG — aligned columns break when names change
const firstName   = 'John'
const lastName    = 'Doe'
const email       = 'john@doe.com'
const phoneNumber = '+1-555-1234'   // adding this breaks all alignment above

// CORRECT — standard consistent alignment
const firstName   = 'John'
const lastName    = 'Doe'
const email       = 'john@doe.com'
const phoneNumber = '+1-555-1234'
```

Wait — actually the rule is SIMPLER:

```
// CORRECT — no special alignment
const firstName = 'John'
const lastName = 'Doe'
const email = 'john@doe.com'
const phoneNumber = '+1-555-1234'
```

---

## Rule 8.9 — Related Things Are Vertically Close

Code that works together should live together. Don't scatter related functions across the file.

```
// CORRECT — related functions grouped near each other
// Validation group
function validateEmail(email) { ... }
function validatePassword(pwd) { ... }
function validateUsername(name) { ... }

// Persistence group
function saveUser(user) { ... }
function loadUser(id) { ... }
function deleteUser(id) { ... }
```

---

## AI Self-Check for Structure

```
□ Is the file organized top-to-bottom (high-level first, details below)?
□ Are blank lines used to separate logical concept groups?
□ Do callers appear above callees?
□ Are lines under 100 characters?
□ Are imports grouped and ordered (stdlib → external → internal → relative)?
□ Are variables declared near their first use?
□ Is there a formatter configured to enforce style automatically?
□ Are related functions grouped near each other in the file?
```
