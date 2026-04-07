---
name: RULE-16-SECURITY
type: ai-behavioral-directive
applies-to: ALL languages
priority: CRITICAL — security rules are non-negotiable
---

# RULE-16 — Security

> **AI DIRECTIVE: Security is not a feature layer added after writing code.
> It is a property of every line of code. Generate secure code by default.
> When in doubt, refuse the unsafe option and explain why.**

---

## Non-Negotiable Security Prohibitions

The AI must NEVER generate code that:

```
□ Interpolates user input directly into SQL, shell commands, or HTML
□ Hardcodes secrets, passwords, API keys, or tokens in source code
□ Logs sensitive data (passwords, tokens, PII, payment data)
□ Transmits secrets in URLs (they appear in server logs, browser history, referrer headers)
□ Disables TLS verification (e.g., verify=False, InsecureSkipVerify: true)
□ Uses MD5 or SHA1 for password hashing
□ Generates cryptographic randomness with Math.random() / rand.Intn() (not crypto-safe)
□ Stores passwords in plaintext or with reversible encryption
□ Grants "admin by default" or "no authentication required" in generated auth flows
□ Uses eval() or equivalent dynamic code execution on user input
```

---

## Rule 16.1 — Injection Prevention (SQL, Shell, HTML, Template)

**Every place user input enters a system must be treated as hostile input.**

### SQL Injection

```
// WRONG — string interpolation = SQL injection
const query = `SELECT * FROM users WHERE email = '${email}'`
db.query(query)

// Go
query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", userID)  // WRONG
db.Query(query)

// CORRECT — parameterized queries in every language
// JS/TS (pg, mysql2, etc.)
db.query('SELECT * FROM users WHERE email = $1', [email])

// Go
db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", userID)

// Python
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

// Rust (sqlx)
sqlx::query!("SELECT * FROM users WHERE email = $1", email)
    .fetch_one(&pool).await?;

// Zig — use a query builder or parameterized interface; never format directly
```

### Shell Injection

```
// WRONG — user input in shell command
const result = exec(`convert ${filename} output.png`)
os.system(f"ffmpeg -i {user_input} output.mp4")

// CORRECT — pass arguments as array (no shell interpretation)
// JS/TS
const result = execFile('convert', [filename, 'output.png'])

// Python
subprocess.run(['ffmpeg', '-i', sanitized_input, 'output.mp4'], check=True)

// Go
cmd := exec.Command("convert", filename, "output.png")
```

### HTML/Template Injection (XSS)

```
// WRONG — raw HTML insertion
element.innerHTML = userInput               // XSS vector
document.write(userInput)                  // XSS vector
template = `<div>${userComment}</div>`     // XSS vector

// CORRECT — use safe APIs
element.textContent = userInput            // text only — no HTML interpretation
// React: JSX auto-escapes
// Template engines: use auto-escaping (Jinja2's {{ }} not {%raw%})
// When HTML IS needed from user: sanitize with a dedicated library (DOMPurify, sanitize-html)
```

---

## Rule 16.2 — Secrets Management

```
// WRONG — secrets in source code
const API_KEY = "sk-prod-abc123xyz"
const DB_URL  = "postgresql://admin:password123@prod-db:5432/app"
const SECRET  = "supersecretjwtkey123"

// WRONG — secrets in comments (still in git history)
// Old key: sk-old-abc123
// Test: admin/password

// CORRECT — secrets from environment / secret management
const API_KEY = process.env.STRIPE_SECRET_KEY
if (!API_KEY) throw new Error("STRIPE_SECRET_KEY environment variable is not set")

// Go
apiKey := os.Getenv("STRIPE_SECRET_KEY")
if apiKey == "" {
    log.Fatal("STRIPE_SECRET_KEY not set")
}

// Rust
let api_key = std::env::var("STRIPE_SECRET_KEY")
    .expect("STRIPE_SECRET_KEY must be set");

// Python
api_key = os.environ["STRIPE_SECRET_KEY"]  # raises KeyError if missing
```

### .gitignore Must Include

```
# Always generate .gitignore entries for:
.env
.env.local
.env.production
*.secret
config/secrets.*
credentials.json
service-account*.json
```

---

## Rule 16.3 — Authentication vs Authorization

```
// Authentication: "Who are you?" → verify identity (login, token validation)
// Authorization:  "What can you do?" → check permissions after identity is known

// WRONG — only checks authentication (is user logged in?), not authorization (can they access THIS resource?)
app.get('/orders/:id', requireAuth, async (req, res) => {
    const order = await db.orders.findById(req.params.id)
    res.json(order)  // Any logged-in user can access ANY order!
})

// CORRECT — check both: authenticated AND authorized
app.get('/orders/:id', requireAuth, async (req, res) => {
    const order = await db.orders.findById(req.params.id)
    if (!order)                          return res.status(404).json({ error: 'Not found' })
    if (order.customerId !== req.user.id && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(order)
})
```

---

## Rule 16.4 — Password Handling

```
// WRONG — store plaintext or weak hash
user.password = password                           // plaintext
user.password = md5(password)                     // MD5 is broken
user.password = sha256(password)                  // SHA256 without salt = broken

// CORRECT — use purpose-built password hashing
// JS/TS
const hash = await bcrypt.hash(password, 12)       // 12 = work factor
const valid = await bcrypt.compare(input, hash)

// Python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
hash = pwd_context.hash(password)
valid = pwd_context.verify(input, hash)

// Rust
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};

// Go
import "golang.org/x/crypto/bcrypt"
hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
```

---

## Rule 16.5 — Cryptographically Secure Randomness

```
// WRONG — Math.random() / rand.Intn() are NOT cryptographically secure
const token = Math.random().toString(36)      // predictable
const otp   = Math.floor(Math.random() * 1e6)

// CORRECT — use CSPRNG in every language
// JS/TS (Node)
import { randomBytes, randomUUID } from 'node:crypto'
const token = randomBytes(32).toString('hex')
const id    = randomUUID()

// Python
import secrets
token = secrets.token_hex(32)
otp   = secrets.randbelow(1_000_000)

// Go
import "crypto/rand"
b := make([]byte, 32)
rand.Read(b)
token := hex.EncodeToString(b)

// Rust
use rand::RngCore;
let mut key = [0u8; 32];
rand::thread_rng().fill_bytes(&mut key);
```

---

## Rule 16.6 — Input Validation at Trust Boundaries

Every entry point from an untrusted source must validate input before use:

```
// Trust boundaries: HTTP requests, CLI args, file contents, env vars, IPC messages

// CORRECT — validate at entry, work with validated types inside
function handleCreateOrder(rawBody: unknown): Order {
    // Validate at the trust boundary
    const parsed = CreateOrderSchema.parse(rawBody)  // throws on invalid

    // From here on, 'parsed' is a validated, typed CreateOrderInput
    return orderService.create(parsed)
}

// The schema IS the contract — validation and type safety in one place
const CreateOrderSchema = z.object({
    customerId: z.string().uuid(),
    items: z.array(z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(999),
    })).min(1).max(100),
})
```

---

## Rule 16.7 — Rate Limiting and Brute Force Prevention

The AI must flag any authentication/sensitive endpoint that lacks rate limiting:

```
// Flag these as needing rate limiting:
POST /auth/login          // brute force risk
POST /auth/register       // account spam risk
POST /auth/forgot-password // enumeration + spam risk
POST /auth/verify-otp     // brute force risk
GET  /api/search          // DoS / scraping risk

// When generating auth code, always note:
// ⚠️ This endpoint requires rate limiting (e.g., 5 attempts per IP per minute).
//    Apply middleware: express-rate-limit, golang.org/x/time/rate, slowapi (Python)
```

---

## Security Checklist

```
□ All user inputs parameterized before use in DB/shell queries?
□ No secrets/credentials in source code?
□ .env files in .gitignore?
□ Authorization checked (not just authentication) on every resource endpoint?
□ Passwords hashed with bcrypt/argon2/scrypt — not MD5/SHA?
□ Cryptographic randomness from CSPRNG — not Math.random()?
□ TLS verification enabled everywhere?
□ Sensitive data (tokens, passwords) absent from logs?
□ Input validated at every trust boundary?
□ Rate limiting noted for authentication endpoints?
```
