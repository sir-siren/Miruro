---
name: go-clean-code
trigger: "Go clean code, Go best practices, Go idioms, Go error handling, idiomatic Go, Golang"
---

# Go — Clean Code Guide

> Always load alongside `31-universal-clean-code.md`.
> Go version: 1.22+

---

## The Go Philosophy

> "Clear is better than clever." — Rob Pike
> "Errors are values." — Rob Pike

Go is deliberately simple. Idiomatic Go embraces:

- Explicit error handling — no exceptions
- Composition over inheritance — interfaces + embedding
- Simplicity — no generics abuse, no framework religion
- Readable at a glance — code explains itself

---

## Naming Conventions

```go
// Packages: short, lowercase, singular noun (no underscores, no camelCase)
package order
package httputil
package config

// NOT: package orderService, package http_util, package myPackage

// Exported (Public): PascalCase
type OrderService struct { }
func NewOrderService(repo OrderRepository) *OrderService { }
const MaxRetryAttempts = 3

// Unexported (Private): camelCase
type orderCache struct { }
func buildQueryString(params map[string]string) string { }
var defaultTimeout = 5 * time.Second

// Interfaces: typically end in -er or -able (idiomatic Go)
type Reader interface { Read(p []byte) (n int, err error) }
type OrderRepository interface { FindByID(ctx context.Context, id OrderID) (*Order, error) }
type Validator interface { Validate() error }

// Getters: don't prefix with Get
// ❌ func (u *User) GetName() string
// ✅ func (u *User) Name() string

// Boolean methods: is/has/can prefix OK
func (u *User) IsActive() bool { return u.status == StatusActive }
```

---

## Error Handling — The Go Way

```go
// ❌ Ignored error — the most common Go mistake
f, _ := os.Open("config.json")

// ✅ Always handle — no exceptions to this rule
f, err := os.Open("config.json")
if err != nil {
    return fmt.Errorf("open config: %w", err)  // wrap with context using %w
}
defer f.Close()

// ✅ Sentinel errors for expected conditions
var (
    ErrOrderNotFound   = errors.New("order not found")
    ErrOrderNotPending = errors.New("order is not in pending status")
)

// Check with errors.Is (works through wrapping chains)
if errors.Is(err, ErrOrderNotFound) { ... }

// ✅ Custom error types for rich context
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for %s: %s", e.Field, e.Message)
}

// Check with errors.As
var valErr *ValidationError
if errors.As(err, &valErr) {
    log.Printf("invalid field: %s", valErr.Field)
}

// ✅ Wrap errors with context at every layer boundary
func (s *OrderService) PlaceOrder(ctx context.Context, cmd PlaceOrderCommand) (*Order, error) {
    order, err := s.repo.FindByID(ctx, cmd.OrderID)
    if err != nil {
        return nil, fmt.Errorf("place order %s: find: %w", cmd.OrderID, err)
    }
    // ...
}
```

---

## Interface Design

```go
// ✅ Small interfaces — the smaller the better
// The io.Reader/Writer principle: one method interfaces are powerful
type OrderSaver interface {
    Save(ctx context.Context, order *Order) error
}

type OrderFinder interface {
    FindByID(ctx context.Context, id OrderID) (*Order, error)
}

// Compose at the consumer level
type OrderRepository interface {
    OrderSaver
    OrderFinder
    FindByCustomer(ctx context.Context, customerID CustomerID) ([]*Order, error)
}

// ✅ Accept interfaces, return structs — Go's golden rule
// This keeps your functions flexible (accept any impl) and concrete (return known type)
func NewOrderService(repo OrderRepository, events EventPublisher) *OrderService {
    return &OrderService{repo: repo, events: events}
}

// ✅ Define interfaces at the point of use — not in the package that implements them
// order/service.go defines:
type orderRepository interface { ... }  // unexported — local to this package
// postgres/order_repo.go implements it (Go's structural typing — no `implements` keyword)
```

---

## Struct & Constructor Patterns

```go
// ✅ Options pattern for structs with many optional fields (Go equivalent of Builder)
type ServerConfig struct {
    host        string
    port        int
    timeout     time.Duration
    maxConns    int
    tlsEnabled  bool
}

type Option func(*ServerConfig)

func WithHost(host string) Option     { return func(c *ServerConfig) { c.host = host } }
func WithPort(port int) Option        { return func(c *ServerConfig) { c.port = port } }
func WithTimeout(d time.Duration) Option { return func(c *ServerConfig) { c.timeout = d } }

func NewServer(opts ...Option) *Server {
    cfg := &ServerConfig{
        host:     "localhost",
        port:     8080,
        timeout:  30 * time.Second,
        maxConns: 100,
    }
    for _, opt := range opts { opt(cfg) }
    return &Server{config: cfg}
}

// Usage
srv := NewServer(
    WithHost("0.0.0.0"),
    WithPort(9090),
    WithTimeout(60 * time.Second),
)
```

---

## Context — Always First

```go
// Context goes first in every function that does I/O or is cancellable
func (r *PostgresOrderRepo) FindByID(ctx context.Context, id OrderID) (*Order, error) { }
func (s *OrderService) PlaceOrder(ctx context.Context, cmd PlaceOrderCommand) (*Order, error) { }
func sendEmail(ctx context.Context, to, subject, body string) error { }

// ✅ Propagate context — never ignore it
func (s *OrderService) ConfirmOrder(ctx context.Context, id OrderID) error {
    order, err := s.repo.FindByID(ctx, id)   // pass ctx down
    if err != nil { return fmt.Errorf("confirm order: %w", err) }

    if err := s.payment.Charge(ctx, order.Total()); err != nil {  // pass ctx down
        return fmt.Errorf("confirm order: charge: %w", err)
    }
    return s.repo.Save(ctx, order)
}

// ✅ Store request-scoped values in context (user ID, trace ID)
type contextKey string
const userIDKey contextKey = "userID"

func WithUserID(ctx context.Context, id UserID) context.Context {
    return context.WithValue(ctx, userIDKey, id)
}

func UserIDFromContext(ctx context.Context) (UserID, bool) {
    id, ok := ctx.Value(userIDKey).(UserID)
    return id, ok
}
```

---

## Concurrency Patterns

```go
// ✅ Goroutine + channel for fan-out/fan-in
func processAll(ctx context.Context, items []Item) ([]Result, error) {
    results := make(chan Result, len(items))
    errs    := make(chan error, 1)

    var wg sync.WaitGroup
    for _, item := range items {
        wg.Add(1)
        go func(item Item) {
            defer wg.Done()
            result, err := process(ctx, item)
            if err != nil {
                select { case errs <- err: default: }
                return
            }
            results <- result
        }(item)
    }

    go func() { wg.Wait(); close(results) }()

    var out []Result
    for r := range results { out = append(out, r) }
    select { case err := <-errs: return nil, err; default: }
    return out, nil
}

// ✅ errgroup for cleaner fan-out
import "golang.org/x/sync/errgroup"

func loadDashboard(ctx context.Context, userID UserID) (*Dashboard, error) {
    g, ctx := errgroup.WithContext(ctx)

    var user *User
    var orders []*Order

    g.Go(func() error { var err error; user, err = userRepo.Find(ctx, userID); return err })
    g.Go(func() error { var err error; orders, err = orderRepo.FindByUser(ctx, userID); return err })

    if err := g.Wait(); err != nil { return nil, err }
    return buildDashboard(user, orders), nil
}
```

---

## Package Organization

```
myapp/
├── cmd/
│   └── server/
│       └── main.go          ← composition root + HTTP server bootstrap
├── internal/                ← private — cannot be imported by external packages
│   ├── domain/
│   │   ├── order.go
│   │   └── order_test.go
│   ├── service/
│   │   └── order_service.go
│   └── repository/
│       └── postgres_orders.go
└── pkg/                     ← public packages (if this is a library)
    └── orderapi/
```

---

## Go Clean Code Checklist

- [ ] Every error returned — none ignored with `_`?
- [ ] All errors wrapped with `%w` and context at layer boundaries?
- [ ] Interfaces defined at the point of use (consumer package)?
- [ ] Accept interfaces, return structs?
- [ ] Context passed as first argument to all I/O functions?
- [ ] Options pattern for structs with optional config?
- [ ] Goroutines always have a clear owner and defined lifetime?
- [ ] No global mutable state?
- [ ] `go vet` + `staticcheck` passing cleanly?
