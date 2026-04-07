---
name: clean-code-functions
trigger: "functions, clean functions, function size, function arguments, side effects, function rules, do one thing"
---

# Clean Code — Functions

> **"The first rule of functions is that they should be small. The second rule of functions is
> that they should be smaller than that."**
> — Robert C. Martin

Functions are the primary unit of organization in any program. Clean functions are like
well-written paragraphs: each makes one clear point.

---

## Rule 1: Functions Should Be Small

- Ideally **< 10 lines**; hard limit **20 lines**
- If a function scrolls off the screen, it's doing too much
- Each function should be **obviously** doing exactly one thing

```typescript
// ❌ Long function doing multiple things
async function processUserRegistration(data: RegistrationData): Promise<void> {
    // Validation
    if (!data.email.includes("@")) throw new Error("Invalid email");
    if (data.password.length < 8) throw new Error("Password too short");
    if (!data.username.match(/^[a-z0-9_]+$/i))
        throw new Error("Invalid username");

    // Check uniqueness
    const existingUser = await db.users.findOne({ email: data.email });
    if (existingUser) throw new Error("Email already registered");

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Save user
    const user = await db.users.create({ ...data, password: hashedPassword });

    // Send email
    await mailer.send({
        to: user.email,
        subject: "Welcome!",
        body: `Hi ${user.username}, welcome to our platform!`,
    });

    // Log
    logger.info(`User registered: ${user.id}`);
}

// ✅ Each function does one thing at one level of abstraction
async function processUserRegistration(data: RegistrationData): Promise<void> {
    validateRegistrationData(data);
    await assertEmailIsUnique(data.email);
    const user = await createUser(data);
    await sendWelcomeEmail(user);
    logger.info(`User registered: ${user.id}`);
}

function validateRegistrationData(data: RegistrationData): void {
    assertValidEmail(data.email);
    assertStrongPassword(data.password);
    assertValidUsername(data.username);
}

async function assertEmailIsUnique(email: string): Promise<void> {
    const existing = await db.users.findOne({ email });
    if (existing) throw new EmailAlreadyRegisteredError(email);
}

async function createUser(data: RegistrationData): Promise<User> {
    const hashedPassword = await hashPassword(data.password);
    return db.users.create({ ...data, password: hashedPassword });
}
```

---

## Rule 2: Do ONE Thing

A function does one thing when **all the steps inside it are at the same level of abstraction** and
you cannot meaningfully extract a named sub-function from it.

```typescript
// ❌ Mixes high-level orchestration with low-level detail
function renderPage(page: Page): string {
    const title = `<h1>${page.title}</h1>`;

    // Low-level HTML generation mixed with high-level logic
    const rows = page.items
        .map(
            (item) =>
                `<tr><td>${item.name}</td><td>$${(item.price / 100).toFixed(2)}</td></tr>`,
        )
        .join("");

    return `<html><body>${title}<table>${rows}</table></body></html>`;
}

// ✅ Each level of abstraction in its own function
function renderPage(page: Page): string {
    return buildHTML(renderTitle(page.title), renderItemTable(page.items));
}

function renderTitle(title: string): string {
    return `<h1>${title}</h1>`;
}

function renderItemTable(items: Item[]): string {
    return `<table>${items.map(renderItemRow).join("")}</table>`;
}

function renderItemRow(item: Item): string {
    return `<tr><td>${item.name}</td><td>${formatPrice(item.price)}</td></tr>`;
}

function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}
```

---

## Rule 3: One Level of Abstraction Per Function

Mixing levels is the most common function smell:

| Level | Example                                                             |
| ----- | ------------------------------------------------------------------- |
| High  | `generateReport()`, `processOrder()`, `authenticateUser()`          |
| Mid   | `fetchUserFromDB()`, `validateForm()`, `buildEmailBody()`           |
| Low   | `buffer.write(data)`, `parseInt(str, 10)`, `arr.filter(x => x > 0)` |

Never mix high and low in the same function.

---

## Rule 4: Argument Count

| # Args      | Status                             |
| ----------- | ---------------------------------- |
| 0 (niladic) | Ideal                              |
| 1 (monadic) | Good — transformation or query     |
| 2 (dyadic)  | Acceptable with good names         |
| 3 (triadic) | Reconsider — use an options object |
| 4+          | Refactor immediately               |

```typescript
// ❌ Too many args — easy to get order wrong
function createEvent(
    title: string,
    date: Date,
    location: string,
    isPublic: boolean,
    maxAttendees: number,
) {}

// ✅ Options object — named, extensible, readable
interface CreateEventOptions {
    title: string;
    date: Date;
    location: string;
    isPublic?: boolean;
    maxAttendees?: number;
}

function createEvent(options: CreateEventOptions): Event {}
```

---

## Rule 5: No Side Effects

A function should do what its name says and **nothing else**. Hidden side effects are bugs waiting to happen.

```typescript
// ❌ checkPassword has a hidden side effect: initializing a session!
function checkPassword(username: string, password: string): boolean {
    const user = users.find((u) => u.name === username);
    if (!user) return false;
    if (user.passwordHash !== hash(password)) return false;

    Session.initialize(); // ← HIDDEN SIDE EFFECT: callers don't expect this
    return true;
}

// ✅ Keep verification and session management separate
function verifyPassword(username: string, password: string): boolean {
    const user = users.find((u) => u.name === username);
    return !!user && user.passwordHash === hash(password);
}

function login(username: string, password: string): Session {
    if (!verifyPassword(username, password))
        throw new AuthError("Invalid credentials");
    return Session.create(username);
}
```

---

## Rule 6: Command-Query Separation

A function either **changes state** (command) OR **returns information** (query) — never both.

```typescript
// ❌ Changes state AND returns a value — confusing
function addAndGet(collection: string[], item: string): string[] {
    collection.push(item);
    return collection;
}

// ✅ Separate concerns
function addItem(collection: string[], item: string): void {
    collection.push(item);
}

function getItems(collection: string[]): string[] {
    return [...collection];
}
```

---

## Rule 7: Prefer Exceptions Over Error Codes

```typescript
// ❌ Error codes force callers into nested conditionals
function deleteUser(id: string): number {
    if (!userExists(id)) return -1;
    if (!hasPermission()) return -2;
    performDelete(id);
    return 0;
}

const result = deleteUser(id);
if (result === -1) {
    /* handle */
} else if (result === -2) {
    /* handle */
}

// ✅ Exceptions keep the happy path clean and errors typed
class UserNotFoundError extends Error {
    constructor(id: string) {
        super(`User ${id} not found`);
    }
}
class PermissionDeniedError extends Error {}

async function deleteUser(id: string): Promise<void> {
    if (!(await userExists(id))) throw new UserNotFoundError(id);
    if (!hasPermission()) throw new PermissionDeniedError();
    await performDelete(id);
}
```

---

## Rule 8: Don't Repeat Yourself (DRY at Function Level)

Every time you copy-paste code, ask: should this be a function?

```typescript
// ❌ Duplicated validation logic in 3 places
if (email === null || email === undefined || email.trim() === "") {
    throw new Error("Email required");
}

// ✅ Extract to a named utility
function requireNonEmpty(
    value: string | null | undefined,
    fieldName: string,
): string {
    if (value == null || value.trim() === "")
        throw new ValidationError(`${fieldName} is required`);
    return value.trim();
}

const email = requireNonEmpty(rawEmail, "Email");
```

---

## Function Complexity Limits

| Metric                | Limit                       | Why                                    |
| --------------------- | --------------------------- | -------------------------------------- |
| Lines                 | ≤ 20 (aim for ≤ 10)         | Forces single responsibility           |
| Parameters            | ≤ 3 (4+ use options object) | Cognitive load                         |
| Cyclomatic complexity | ≤ 10                        | Number of independent paths            |
| Nesting depth         | ≤ 3                         | Use early returns to flatten           |
| Cognitive complexity  | ≤ 15                        | Sonar-style human-perceived complexity |
