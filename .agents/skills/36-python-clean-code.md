---
name: python-clean-code
trigger: "Python clean code, Python best practices, Python idioms, Pythonic code, type hints Python, Python patterns"
---

# Python — Clean Code Guide

> Always load alongside `31-universal-clean-code.md`.
> Python version: 3.11+ with full type hints.

---

## The Python Philosophy

```python
import this  # The Zen of Python — PEP 20
# Key principles:
# Beautiful is better than ugly.
# Explicit is better than implicit.
# Simple is better than complex.
# Readability counts.
# There should be one — and preferably only one — obvious way to do it.
```

---

## Naming Conventions (PEP 8)

```python
# Modules and packages: lowercase_with_underscores
import order_service
from payment_gateway import stripe_client

# Classes: PascalCase
class OrderService:
class UserRepository:
class InvalidOrderStatusError(ValueError):

# Functions and methods: lowercase_with_underscores
def calculate_total(items: list[OrderItem]) -> Decimal:
def send_confirmation_email(order: Order) -> None:

# Constants: UPPER_SNAKE_CASE
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30
API_BASE_URL = "https://api.example.com"

# Private: prefix with single underscore
def _build_query(filters: dict) -> str:  # internal helper
self._connection: Connection             # private attribute

# "Name mangling" (avoid unless needed): double underscore
self.__secret_key  # only when genuinely preventing subclass override

# Booleans: is_/has_/can_ prefix
is_active: bool
has_permission: bool
can_delete: bool
```

---

## Type Hints — Always On

```python
from __future__ import annotations  # enables forward references in all Python 3.10+
from typing import TypeVar, Generic, Protocol, TypeAlias
from collections.abc import Sequence, Callable, AsyncIterator

# ✅ Fully annotated function signatures
def create_order(
    customer_id: CustomerId,
    items: list[OrderItemInput],
    payment_method: PaymentMethod,
) -> Order:
    ...

# ✅ TypeAlias for domain-specific types
CustomerId: TypeAlias = str  # weak but better than raw str
OrderId:    TypeAlias = str

# ✅ NewType for stronger domain typing
from typing import NewType
CustomerId = NewType("CustomerId", str)
OrderId    = NewType("OrderId", str)

# ✅ TypeVar for generics
T = TypeVar("T")

def first(items: Sequence[T]) -> T | None:
    return items[0] if items else None

# ✅ Protocol for structural typing (like Go interfaces)
from typing import Protocol

class Repository(Protocol[T]):
    def find_by_id(self, id: str) -> T | None: ...
    def save(self, entity: T) -> None: ...

# ✅ Dataclass for value objects
from dataclasses import dataclass, field

@dataclass(frozen=True)  # frozen = immutable
class Money:
    amount: int  # in cents
    currency: str = "USD"

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise CurrencyMismatchError(self.currency, other.currency)
        return Money(self.amount + other.amount, self.currency)

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
```

---

## Error Handling — The Pythonic Way

```python
# ✅ Define typed exception hierarchy
class AppError(Exception):
    """Base exception for all application errors."""

class OrderError(AppError):
    pass

class OrderNotFoundError(OrderError):
    def __init__(self, order_id: str) -> None:
        self.order_id = order_id
        super().__init__(f"Order {order_id!r} not found")

class OrderValidationError(OrderError):
    def __init__(self, field: str, message: str) -> None:
        self.field = field
        super().__init__(f"Validation failed for {field!r}: {message}")

# ✅ Catch specific exceptions — never bare `except:`
try:
    order = await repo.find_by_id(order_id)
except OrderNotFoundError:
    return None
except DatabaseError as exc:
    logger.exception("DB error finding order %s", order_id)
    raise OrderError("database unavailable") from exc

# ❌ Never swallow exceptions silently
try:
    risky_operation()
except Exception:
    pass  # ← This is always wrong

# ✅ Context managers for resource cleanup
with open("data.json") as f:
    data = json.load(f)

# ✅ Custom context manager
from contextlib import contextmanager

@contextmanager
def db_transaction(session: Session) -> Iterator[Session]:
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
```

---

## Pythonic Patterns

### List/Dict/Set Comprehensions

```python
# ✅ Comprehension instead of manual loop accumulation
active_emails = [user.email for user in users if user.is_active]
order_by_id   = {order.id: order for order in orders}
unique_tags   = {tag for post in posts for tag in post.tags}

# ❌ Don't use comprehensions for side effects
[send_email(user) for user in users]  # use a regular for loop
for user in users:
    send_email(user)                  # ← explicit, readable

# ❌ Don't write complex multi-line comprehensions
result = [
    transform(item)
    for item in source
    if condition_a(item)
    if condition_b(item)
    if condition_c(item)
]
# If it's this long: use a regular loop or extract a helper
```

### Generators for Lazy Evaluation

```python
# ✅ Generator for large sequences — doesn't load everything into memory
def read_csv_rows(path: Path) -> Iterator[dict[str, str]]:
    with open(path) as f:
        reader = csv.DictReader(f)
        yield from reader

# ✅ Generator expression instead of list comprehension when you only iterate once
total = sum(item.price * item.qty for item in order.items)
```

### Dataclasses and NamedTuples

```python
# ✅ dataclass for mutable value containers
@dataclass
class OrderItem:
    product_id: str
    qty: int
    unit_price: Decimal

    def subtotal(self) -> Decimal:
        return self.unit_price * self.qty

# ✅ frozen dataclass for immutable value objects
@dataclass(frozen=True)
class Address:
    street: str
    city: str
    postal_code: str

# ✅ NamedTuple for simple readonly records
from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

### ABC and Protocol for Interfaces

```python
from abc import ABC, abstractmethod

# Abstract base class (nominal typing — must explicitly subclass)
class PaymentProcessor(ABC):
    @abstractmethod
    def charge(self, amount: Money, method: PaymentMethod) -> ChargeResult:
        ...

    @abstractmethod
    def refund(self, charge_id: str, amount: Money) -> RefundResult:
        ...

# Protocol (structural typing — any class with the right methods qualifies)
from typing import Protocol

class Notifiable(Protocol):
    def notify(self, message: str) -> None: ...

def send_all(recipients: list[Notifiable], message: str) -> None:
    for r in recipients:
        r.notify(message)
```

---

## Async Patterns

```python
import asyncio
from typing import Any

# ✅ Parallel async with gather
async def load_dashboard(user_id: str) -> Dashboard:
    user, orders, notifications = await asyncio.gather(
        user_repo.find(user_id),
        order_repo.find_by_user(user_id),
        notification_repo.find_unread(user_id),
    )
    return Dashboard(user=user, orders=orders, notifications=notifications)

# ✅ Typed async generators
async def paginate_orders(user_id: str) -> AsyncIterator[list[Order]]:
    cursor = None
    while True:
        page = await order_repo.find_page(user_id, cursor=cursor, size=50)
        if not page.items:
            return
        yield page.items
        if not page.next_cursor:
            return
        cursor = page.next_cursor
```

---

## Module & Package Structure

```
myapp/
├── pyproject.toml
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── domain/
│       │   ├── __init__.py
│       │   ├── order.py       ← Order entity, value objects
│       │   └── errors.py      ← domain exceptions
│       ├── application/
│       │   └── place_order.py ← use case
│       ├── infrastructure/
│       │   ├── postgres_repo.py
│       │   └── stripe_gateway.py
│       └── api/
│           └── order_router.py
└── tests/
    ├── domain/
    └── application/
```

---

## Python Clean Code Checklist

- [ ] Full type hints on all function signatures?
- [ ] `mypy --strict` passing cleanly?
- [ ] Named exception hierarchy — no bare `raise Exception("...")`?
- [ ] No bare `except:` or empty `except Exception: pass`?
- [ ] Dataclasses for value objects (`frozen=True` for immutable)?
- [ ] Comprehensions for transformation, regular loops for side effects?
- [ ] `Protocol` or `ABC` for all polymorphic interfaces?
- [ ] Context managers (`with`) for all resource acquisition?
- [ ] No mutable default arguments (`def f(items: list = [])` is a bug)?
- [ ] `ruff` + `mypy` configured and passing in CI?
