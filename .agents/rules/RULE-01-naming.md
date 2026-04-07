---
name: RULE-01-NAMING
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-01 — Naming

> **AI DIRECTIVE: Every name you generate must pass the "instant comprehension" test.
> A reader who has never seen this code must understand a name's purpose within 3 seconds
> of reading it — without needing a comment, a docstring, or surrounding context.**

---

## Absolute Prohibitions

The AI **MUST NEVER** generate these names:

```
BANNED single-letter names (outside loop counters i/j/k):
  d, x, y, z, n, m, s, t, f, g, r, l, p, q, v, c, e, a, b

BANNED meaningless names:
  data, info, stuff, thing, result, value, temp, tmp,
  obj, item, element, node, entry, record, entity,
  foo, bar, baz, qux, test, dummy, flag, check, ok

BANNED type-encoded names (Hungarian notation):
  strName, intCount, boolActive, arrItems, objUser, fnCallback

BANNED abbreviations (unless universally known):
  usr, acct, num, btn, cfg, mgr, svc, util, hlpr, rqst, rsp
  (ALLOWED: id, url, html, css, api, http, db, ui, io, os, fs)
```

---

## Mandatory Naming Rules

### Rule 1.1 — Names Reveal Intent

The name must answer: **What is this? What does it contain/do? Why does it exist?**

```
// WRONG — what is d? days? distance? depth?
d = calculate(x, y)

// CORRECT
daysSinceLastLogin = calculateDaysBetween(lastLoginDate, today)
```

### Rule 1.2 — Booleans Use is/has/can/should/was Prefix

```
// WRONG
active, enabled, loaded, valid, admin, premium
delete, open, visible

// CORRECT
isActive, isEnabled, isLoaded, isValid, isAdmin, isPremium
canDelete, isOpen, isVisible
wasSuccessful, hasPermission, shouldRefetch
```

### Rule 1.3 — Functions Are Verb Phrases

```
// WRONG — noun names on functions
userValidation(), passwordHash(), emailSend()

// CORRECT — verb + noun describes the action
validateUser(), hashPassword(), sendEmail()
fetchOrderById(), calculateTotalCost(), parseConfigFile()
buildQueryString(), transformToDTO(), assertNonEmpty()
```

### Rule 1.4 — Collections Are Plural Nouns

```
// WRONG
userList, orderArray, itemCollection, userData

// CORRECT
users, orders, items, pendingNotifications, activeSessionIds
```

### Rule 1.5 — No Magic Numbers or Magic Strings

Every literal value with semantic meaning gets a named constant:

```
// WRONG
if age > 18 { ... }
setTimeout(callback, 86400000)
if status == "TIER_2" { ... }
buffer = make([]byte, 4096)

// CORRECT
LEGAL_AGE = 18
ONE_DAY_MS = 24 * 60 * 60 * 1000
PREMIUM_TIER = "TIER_2"
READ_BUFFER_SIZE = 4096

if age > LEGAL_AGE { ... }
setTimeout(callback, ONE_DAY_MS)
if status == PREMIUM_TIER { ... }
buffer = make([]byte, READ_BUFFER_SIZE)
```

### Rule 1.6 — Names Match the Domain Language

Use the vocabulary of the business domain, not technical jargon:

```
// WRONG — technical vocabulary disconnected from domain
class DataRecord { processEntry(payload) }
handleRowMutation(deltaObject)

// CORRECT — domain vocabulary
class Invoice { issue(customer) }
applyDiscountToOrder(discount, order)
```

### Rule 1.7 — No Noise Words

Noise words add length without meaning:

```
// WRONG — "Manager", "Handler", "Processor", "Helper", "Util" often signal god objects
UserManager, DataHandler, OrderProcessor, StringHelper, DateUtil

// CORRECT — be specific about what it does
UserAuthenticator, InvoiceFormatter, OrderValidator, DateRangeFormatter
// (If it genuinely does many things → SRP violation → see RULE-04)
```

### Rule 1.8 — Searchable Names

```
// WRONG — impossible to grep for
e.preventDefault()   // what is 'e'?
items.forEach(i => doWork(i.v * i.q))

// CORRECT — searchable, explicit
event.preventDefault()
items.forEach(item => doWork(item.unitPrice * item.quantity))
```

---

## Language-Specific Naming Conventions

| Construct   | JS/TS                 | Rust              | Go              | Python            | Zig               |
| ----------- | --------------------- | ----------------- | --------------- | ----------------- | ----------------- |
| Variable    | `camelCase`           | `snake_case`      | `camelCase`     | `snake_case`      | `camelCase`       |
| Function    | `camelCase`           | `snake_case`      | `camelCase`     | `snake_case`      | `camelCase`       |
| Type/Class  | `PascalCase`          | `PascalCase`      | `PascalCase`    | `PascalCase`      | `PascalCase`      |
| Constant    | `SCREAMING_SNAKE`     | `SCREAMING_SNAKE` | `PascalCase`    | `SCREAMING_SNAKE` | `SCREAMING_SNAKE` |
| Module/File | `kebab-case.ts`       | `snake_case.rs`   | `snake_case.go` | `snake_case.py`   | `snake_case.zig`  |
| Private     | `_prefix` or `#field` | no prefix         | lowercase       | `_prefix`         | no pub            |
| Boolean     | `is/has/can` prefix   | `is_/has_/can_`   | `Is/Has/Can`    | `is_/has_/can_`   | `is_/has_/can_`   |

---

## AI Self-Check Before Generating Names

Before finalizing any name, verify:

```
□ Does this name pass the "3-second comprehension" test?
□ Is it free from the banned list above?
□ For booleans: does it start with is/has/can/should/was?
□ For functions: is it a verb phrase?
□ For constants: is it SCREAMING_SNAKE (or language equivalent)?
□ For collections: is it plural?
□ Are magic numbers/strings replaced with named constants?
□ Does it use domain language, not technical jargon?
```
