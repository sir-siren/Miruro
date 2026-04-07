---
name: RULE-23-CONFIGURATION
type: ai-behavioral-directive
applies-to: ALL languages
---

# RULE-23 — Configuration & Environment Management

> **AI DIRECTIVE: Configuration is not code. Code is the same in every environment.
> Configuration is what changes between environments. Keep them separate.
> Validate configuration at startup — fail fast before doing any work with bad config.**

---

## Rule 23.1 — Twelve-Factor Config: All Config From the Environment

```
// WRONG — environment-specific values in source code
const DB_HOST = "prod-db.internal"        // hardcoded env-specific value
const API_URL = "https://api.prod.company.com"
const DEBUG   = false

// WRONG — config in config files committed to version control with real values
// config/production.json: { "database": "postgresql://admin:pass@prod:5432/app" }

// CORRECT — all config from environment variables
const config = {
    databaseUrl:  requireEnv('DATABASE_URL'),
    apiKey:       requireEnv('STRIPE_SECRET_KEY'),
    port:         parseInt(requireEnv('PORT', '3000')),
    isDebug:      requireEnv('DEBUG', 'false') === 'true',
    logLevel:     requireEnv('LOG_LEVEL', 'info'),
}

function requireEnv(key, defaultValue) {
    const value = process.env[key] ?? defaultValue
    if (value === undefined) throw new Error(`Required environment variable ${key} is not set`)
    return value
}
```

---

## Rule 23.2 — Validate Configuration at Startup — Fail Fast

Never let a missing or invalid config value cause a failure deep in a request handler.
Validate everything when the application starts:

```
// CORRECT — config validation at startup (before serving any requests)
function loadAndValidateConfig(): AppConfig {
    const config = {
        databaseUrl:    requireEnv('DATABASE_URL'),
        port:           requireEnvInt('PORT', 3000),
        jwtSecret:      requireEnv('JWT_SECRET'),
        stripeKey:      requireEnv('STRIPE_SECRET_KEY'),
        smtpHost:       requireEnv('SMTP_HOST'),
        maxWorkers:     requireEnvInt('MAX_WORKERS', 4),
    }

    // Semantic validation — not just presence
    if (config.port < 1 || config.port > 65535)
        throw new ConfigError(`PORT must be 1–65535, got ${config.port}`)
    if (config.jwtSecret.length < 32)
        throw new ConfigError('JWT_SECRET must be at least 32 characters')
    if (config.maxWorkers < 1 || config.maxWorkers > 64)
        throw new ConfigError(`MAX_WORKERS must be 1–64, got ${config.maxWorkers}`)

    return config
}

// Called in main/entry point BEFORE anything else:
const config = loadAndValidateConfig()  // crash immediately if misconfigured
const db = connectDatabase(config.databaseUrl)
// ...
```

---

## Rule 23.3 — Config Schema With Types and Defaults

Use a schema validator for complex configs:

```
// TypeScript + Zod: schema is source of truth for config shape and validation
import { z } from 'zod'

const ConfigSchema = z.object({
    port:           z.coerce.number().int().min(1).max(65535).default(3000),
    databaseUrl:    z.string().url(),
    jwtSecret:      z.string().min(32),
    logLevel:       z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
    maxConnections: z.coerce.number().int().min(1).max(100).default(10),
    isProduction:   z.coerce.boolean().default(false),
})

type AppConfig = z.infer<typeof ConfigSchema>

function loadConfig(): AppConfig {
    return ConfigSchema.parse({
        port:           process.env.PORT,
        databaseUrl:    process.env.DATABASE_URL,
        jwtSecret:      process.env.JWT_SECRET,
        logLevel:       process.env.LOG_LEVEL,
        maxConnections: process.env.DB_MAX_CONNECTIONS,
        isProduction:   process.env.NODE_ENV === 'production',
    })
    // parse() throws ZodError with clear message if any field is invalid
}
```

---

## Rule 23.4 — Feature Flags Are Config, Not Code

```
// WRONG — feature flag hardcoded in code
if (ENABLE_NEW_CHECKOUT) { ... }   // can't be changed without a deploy

// WRONG — feature flag in source-controlled config file
// features.json: { "enableNewCheckout": true }  // committed; requires deploy to change

// CORRECT — feature flag from environment / external config service
const features = {
    enableNewCheckout:    requireEnv('FEATURE_NEW_CHECKOUT', 'false') === 'true',
    enableMultiCurrency:  requireEnv('FEATURE_MULTI_CURRENCY', 'false') === 'true',
}

// Or: LaunchDarkly, Unleash, Flagsmith, etc. for runtime toggling
const isEnabled = await featureFlags.isEnabled('new-checkout', { userId })
```

---

## Rule 23.5 — Config Objects Are Read-Only After Load

```
// WRONG — config mutated at runtime
global.config.port = 9090   // changes config mid-flight

// CORRECT — config is immutable after initial load
const config = Object.freeze(loadAndValidateConfig())  // JS/TS: freeze
// config.port = 9090  ← throws in strict mode

// Rust: config as immutable struct
struct Config {
    port:         u16,
    database_url: String,
    jwt_secret:   String,
}
// No setters. Config is read-only after construction.

// Go: pass config as value (not pointer) to prevent mutation
type Config struct { Port int; DatabaseURL string }
func StartServer(cfg Config) { ... }  // receives a copy — can't mutate caller's config
```

---

## Rule 23.6 — .env Files for Local Development Only

```
// .env is for local development convenience — NEVER for production
// .env MUST be in .gitignore — NEVER committed

// .gitignore:
.env
.env.local
.env.development.local
.env.production.local

// Provide a .env.example (committed) showing all required vars WITHOUT real values:
# .env.example — copy to .env and fill in your values
DATABASE_URL=postgresql://localhost:5432/myapp_dev
JWT_SECRET=change-me-to-a-32-char-random-string
STRIPE_SECRET_KEY=sk_test_your_key_here
PORT=3000
LOG_LEVEL=debug
```

---

## Rule 23.7 — Environment-Specific Behavior Is Explicit, Not Implicit

```
// WRONG — implicit environment detection scattered through code
if (process.env.NODE_ENV === 'production') {
    // production behavior
}
// This check is scattered in 20 files; hard to see all env differences

// CORRECT — centralize environment-specific behavior in config
const config = {
    shouldSendRealEmails: process.env.NODE_ENV === 'production',
    logLevel:             process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    dbPool:               process.env.NODE_ENV === 'production' ? 20 : 2,
    useRealPayments:      process.env.PAYMENT_MODE === 'live',
}

// Now services use config values — no scattered NODE_ENV checks
if (config.shouldSendRealEmails) { sendRealEmail(...) } else { logEmailInstead(...) }
```

---

## Configuration Checklist

```
□ Are all environment-specific values in environment variables — not source code?
□ Is configuration validated at startup with clear error messages?
□ Is the config schema typed and documented (.env.example)?
□ Are .env files in .gitignore?
□ Is the config object immutable after load?
□ Are feature flags configuration, not hardcoded booleans?
□ Is environment-specific behavior centralized in config — not scattered as NODE_ENV checks?
□ Does the app fail fast with a clear error if required config is missing?
```
