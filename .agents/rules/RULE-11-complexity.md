---
name: RULE-11-COMPLEXITY
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-11 — Cognitive Complexity & Nesting

> **AI DIRECTIVE: Human working memory can hold ~7 items simultaneously.
> Every additional nesting level, branch, or loop costs one slot.
> Generate code that stays within that budget. Flatten, guard, and return early.**

---

## Hard Limits — Never Exceed

| Metric                                 | Limit             | Action if Exceeded                      |
| -------------------------------------- | ----------------- | --------------------------------------- |
| Nesting depth                          | ≤ 3 levels        | Apply guard clauses / extract functions |
| Cyclomatic complexity                  | ≤ 10 per function | Extract branches into named functions   |
| Function length                        | ≤ 20 lines        | Extract sub-operations                  |
| Cognitive complexity (SonarQube style) | ≤ 15              | Decompose                               |
| Chained method calls                   | ≤ 4               | Break into named intermediates          |
| `if/else if` chain length              | ≤ 4 branches      | Use a lookup table or polymorphism      |

---

## Rule 11.1 — Guard Clauses Over Nested Conditionals

The most impactful single refactoring for readability.
Validate/reject early; let the happy path stay at the ground indentation level.

```
// WRONG — main logic buried at level 4
function processPayment(order) {
    if (order !== null) {
        if (order.total > 0) {
            if (order.customer.isVerified) {
                if (!order.isAlreadyPaid) {
                    // actual logic here — buried
                    chargeCard(order)
                    markAsPaid(order)
                }
            }
        }
    }
}

// CORRECT — rejections at the top; happy path unindented
function processPayment(order) {
    if (order === null)              throw new Error("order required")
    if (order.total <= 0)            throw new Error("order total must be positive")
    if (!order.customer.isVerified)  throw new UnverifiedCustomerError(order.customer.id)
    if (order.isAlreadyPaid)         throw new DuplicatePaymentError(order.id)

    chargeCard(order)
    markAsPaid(order)
}
```

---

## Rule 11.2 — Flatten With Early Return

In functions that process data through multiple stages, return as soon as a condition is met:

```
// WRONG — nesting grows with each condition
function getDiscount(user, order) {
    let discount = 0
    if (user.isPremium) {
        if (order.total > 100) {
            if (order.items.length > 5) {
                discount = 20
            } else {
                discount = 10
            }
        } else {
            discount = 5
        }
    }
    return discount
}

// CORRECT — early returns eliminate nesting
function getDiscount(user, order) {
    if (!user.isPremium)        return 0
    if (order.total <= 100)     return 5
    if (order.items.length > 5) return 20
    return 10
}
```

---

## Rule 11.3 — Replace Complex Conditionals With Named Predicates

Give complex boolean expressions a name. The name IS the documentation.

```
// WRONG — reader must decode the logic
if (user.subscriptionEnd > Date.now() && !user.isBanned && user.emailVerified) { ... }

if (!item.isExpired && item.stock > 0 && !item.isRestricted && user.hasPermission('buy')) { ... }

// CORRECT — named predicates, reads like a sentence
const isSubscriptionActive = user.subscriptionEnd > Date.now()
const isUserEligible        = !user.isBanned && user.emailVerified

if (isSubscriptionActive && isUserEligible) { ... }

function canUserPurchaseItem(user, item) {
    const itemAvailable    = !item.isExpired && item.stock > 0 && !item.isRestricted
    const userAuthorized   = user.hasPermission('buy')
    return itemAvailable && userAuthorized
}
if (canUserPurchaseItem(user, item)) { ... }
```

---

## Rule 11.4 — Replace Long If-Else Chains With Lookup Tables or Polymorphism

If-else chains with 5+ branches are a sign of a missing data structure or missing polymorphism:

```
// WRONG — 6-branch if/else, will grow over time
function getStatusLabel(status) {
    if (status === 'draft')      return 'Draft'
    else if (status === 'placed') return 'Order Placed'
    else if (status === 'confirmed') return 'Confirmed'
    else if (status === 'shipped')   return 'Shipped'
    else if (status === 'delivered') return 'Delivered'
    else if (status === 'cancelled') return 'Cancelled'
    else return 'Unknown'
}

// CORRECT — lookup table; no conditionals
const STATUS_LABELS = {
    draft:     'Draft',
    placed:    'Order Placed',
    confirmed: 'Confirmed',
    shipped:   'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
}
function getStatusLabel(status) {
    return STATUS_LABELS[status] ?? 'Unknown'
}
```

---

## Rule 11.5 — Break Complex Boolean Expressions Into Steps

```
// WRONG — one massive condition
if (
    user.role === 'admin' ||
    (user.role === 'editor' && resource.ownerId === user.id && !resource.isLocked) ||
    (user.role === 'viewer' && resource.isPublic && !resource.requiresLogin)
) { grantAccess() }

// CORRECT — named steps build toward the final answer
const isAdmin          = user.role === 'admin'
const isResourceOwner  = user.role === 'editor' && resource.ownerId === user.id
const isEditableByOwner = isResourceOwner && !resource.isLocked
const isPublicResource  = resource.isPublic && !resource.requiresLogin
const isPublicViewer    = user.role === 'viewer' && isPublicResource

if (isAdmin || isEditableByOwner || isPublicViewer) { grantAccess() }
```

---

## Rule 11.6 — Extract Complex Loop Bodies Into Functions

```
// WRONG — nested loop + complex logic = cognitive overload
for (const department of company.departments) {
    for (const team of department.teams) {
        for (const member of team.members) {
            if (member.isActive && member.skills.includes('security')) {
                const score = member.certifications.reduce((s, c) => s + c.weight, 0)
                if (score > THRESHOLD) {
                    results.push({ member, score, team: team.name })
                }
            }
        }
    }
}

// CORRECT — each level of concern has its own function
function findQualifiedSecurityMembers(company) {
    return company.departments
        .flatMap(dept => dept.teams)
        .flatMap(team => getQualifiedMembers(team))
}

function getQualifiedMembers(team) {
    return team.members
        .filter(isActiveSecurityEngineer)
        .map(member => buildMemberScore(member, team.name))
        .filter(scored => scored.score > QUALIFICATION_THRESHOLD)
}

function isActiveSecurityEngineer(member) {
    return member.isActive && member.skills.includes('security')
}

function buildMemberScore(member, teamName) {
    const score = member.certifications.reduce((s, c) => s + c.weight, 0)
    return { member, score, teamName }
}
```

---

## Rule 11.7 — Avoid Deeply Chained Calls (Law of Demeter)

```
// WRONG — 5-object chain; every intermediate is a coupling point
const postalCode = order.getCustomer().getAddress().getCity().getPostalCode().getValue()

// CORRECT — each object exposes what callers need
class Order {
    getShippingPostalCode() { return this.customer.getPostalCode() }
}
class Customer {
    getPostalCode() { return this.address.postalCode }
}
const postalCode = order.getShippingPostalCode()
```

---

## AI Self-Check for Complexity

```
□ Is nesting depth ≤ 3 levels everywhere?
□ Are complex conditions extracted into named boolean variables?
□ Are guard clauses used instead of nested if blocks?
□ Are long if/else chains replaced with lookup tables or polymorphism?
□ Are complex loop bodies extracted into named functions?
□ Are method chains ≤ 4 dots deep?
□ Can every function be understood in a single mental pass?
□ Would a developer reading this cold understand it in < 30 seconds?
```
