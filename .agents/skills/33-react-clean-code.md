---
name: react-clean-code
trigger: "React clean code, React patterns, component design, hooks, React best practices, React 19, component structure"
---

# React — Clean Code Guide

> Stack: React 19.x + TypeScript 5.8 + Tailwind v4.
> Always load alongside `32-typescript-universal.md`.

---

## Component Design Principles

### One Component, One Concern

```tsx
// ❌ Component does data fetching + business logic + display + side effects
function UserDashboard({ userId }: { userId: string }) {
    const [user, setUser] = useState<User | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        fetch(`/api/users/${userId}`)
            .then((r) => r.json())
            .then(setUser);
        fetch(`/api/orders?userId=${userId}`)
            .then((r) => r.json())
            .then(setOrders);
    }, [userId]);

    const totalSpent = orders.reduce((s, o) => s + o.total, 0);

    return (
        <div>
            <h1>{user?.name}</h1>
            <p>Total spent: ${(totalSpent / 100).toFixed(2)}</p>
            <ul>
                {orders.map((o) => (
                    <li key={o.id}>
                        {o.id}: ${o.total}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ✅ Separated by concern
// Data layer: hooks/use-user-dashboard.ts
function useUserDashboard(userId: string) {
    const { data: user, isLoading: userLoading } = useUser(userId);
    const { data: orders = [], isLoading: ordersLoading } = useOrders(userId);
    const totalSpent = useMemo(
        () => orders.reduce((s, o) => s + o.total, 0),
        [orders],
    );
    return {
        user,
        orders,
        totalSpent,
        isLoading: userLoading || ordersLoading,
    };
}

// Display layer: pure presentational component
function UserDashboard({ userId }: { userId: string }) {
    const { user, orders, totalSpent, isLoading } = useUserDashboard(userId);
    if (isLoading) return <LoadingSpinner />;
    if (!user) return <NotFound />;
    return (
        <div>
            <UserHeader user={user} totalSpent={totalSpent} />
            <OrderList orders={orders} />
        </div>
    );
}
```

---

## Component Size & Extraction

| Signal                            | Action                         |
| --------------------------------- | ------------------------------ |
| > 150 lines                       | Extract child components       |
| > 3 useState calls                | Extract custom hook            |
| JSX deeply nested 3+ levels       | Extract sub-components         |
| Logic duplicated in 2+ components | Extract shared hook or utility |
| Component handles data + display  | Split container/presentational |

---

## Props Design

```tsx
// ✅ Explicit prop types — never use object literals inline in component signature
interface UserCardProps {
    user: UserPreview; // use specific types, never `any` or `object`
    onSelect: (id: UserId) => void; // event handlers with typed arguments
    isSelected?: boolean; // optional with default
    className?: string; // allow style extension via className
}

function UserCard({
    user,
    onSelect,
    isSelected = false,
    className,
}: UserCardProps) {
    return (
        <button
            className={cn(
                "rounded p-4",
                isSelected && "ring-2 ring-blue-500",
                className,
            )}
            onClick={() => onSelect(user.id)}
        >
            {user.name}
        </button>
    );
}

// ✅ Polymorphic component with `as` prop
interface ButtonProps<T extends ElementType = "button"> {
    as?: T;
    children: ReactNode;
    variant?: "primary" | "secondary";
}

function Button<T extends ElementType = "button">({
    as: Tag = "button",
    children,
    variant = "primary",
    ...props
}: ButtonProps<T> & ComponentPropsWithoutRef<T>) {
    return (
        <Tag className={buttonVariants({ variant })} {...props}>
            {children}
        </Tag>
    );
}
```

---

## Custom Hook Patterns

```tsx
// ✅ Hook encapsulates state machine, not just useState wrappers
function useOrderSubmit() {
    type State =
        | { status: "idle" }
        | { status: "submitting" }
        | { status: "success"; orderId: string }
        | { status: "error"; message: string };

    const [state, setState] = useState<State>({ status: "idle" });

    const submit = useCallback(async (input: CreateOrderInput) => {
        setState({ status: "submitting" });
        try {
            const { orderId } = await orderApi.create(input);
            setState({ status: "success", orderId });
        } catch (err) {
            setState({ status: "error", message: getErrorMessage(err) });
        }
    }, []);

    const reset = useCallback(() => setState({ status: "idle" }), []);

    return { state, submit, reset };
}

// ✅ Hooks return stable references — no new objects on every render
function useUserPreferences(userId: UserId) {
    const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);

    const updatePref = useCallback(
        <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
            setPrefs((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    return { prefs, updatePref } as const; // `as const` prevents widening
}
```

---

## React 19 Patterns

```tsx
// ✅ useActionState for form actions (React 19)
import { useActionState } from "react";

async function submitOrderAction(
    prevState: FormState,
    formData: FormData,
): Promise<FormState> {
    const result = CreateOrderSchema.safeParse(Object.fromEntries(formData));
    if (!result.success)
        return { status: "error", errors: result.error.flatten().fieldErrors };

    const order = await orderService.create(result.data);
    return { status: "success", orderId: order.id };
}

function OrderForm() {
    const [state, action, isPending] = useActionState(submitOrderAction, {
        status: "idle",
    });

    return (
        <form action={action}>
            <input name="customerId" required />
            <button disabled={isPending}>
                {isPending ? "Submitting..." : "Place Order"}
            </button>
            {state.status === "error" && (
                <ErrorMessages errors={state.errors} />
            )}
            {state.status === "success" && (
                <SuccessMessage orderId={state.orderId} />
            )}
        </form>
    );
}

// ✅ use() for async resources (React 19)
import { use } from "react";

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
    const user = use(userPromise); // suspends until resolved — wrap in <Suspense>
    return <div>{user.name}</div>;
}
```

---

## Folder & File Structure

```
src/
├── app/                    ← route-level pages (Next.js/React Router)
│
├── features/               ← feature modules (preferred over flat components/)
│   └── orders/
│       ├── index.ts        ← barrel: public API only
│       ├── OrderList.tsx
│       ├── OrderCard.tsx
│       ├── OrderForm.tsx
│       ├── use-orders.ts
│       ├── use-order-submit.ts
│       └── orders.api.ts
│
├── components/             ← shared, generic UI (no domain logic)
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── DataTable.tsx
│
├── hooks/                  ← shared hooks (useDebounce, useLocalStorage)
├── lib/                    ← utilities, formatters, constants
└── types/                  ← shared TypeScript types
```

---

## Component Anti-Patterns

```tsx
// ❌ useEffect for derived state — use useMemo
useEffect(() => {
  setFilteredItems(items.filter(i => i.isActive))
}, [items])

// ✅
const filteredItems = useMemo(() => items.filter(i => i.isActive), [items])

// ❌ Prop drilling 3+ levels — use context or composition
<Page user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <Avatar user={user} />   // ← 4 levels deep
    </Sidebar>
  </Layout>
</Page>

// ✅ Composition (slot pattern)
<Page>
  <Sidebar avatar={<Avatar user={user} />} />
</Page>

// ❌ Index keys on dynamic lists — breaks reconciliation
{items.map((item, i) => <Item key={i} {...item} />)}

// ✅ Stable unique IDs
{items.map(item => <Item key={item.id} {...item} />)}

// ❌ Inline arrow functions in JSX creating new references (only matters if React Compiler is off)
<Button onClick={() => handleDelete(id)} />  // new fn every render without Compiler

// ✅ With React Compiler (React 19): fine as-is
// Without Compiler: useCallback or move handler out
```

---

## React Clean Code Checklist

- [ ] Each component has one clearly stated responsibility?
- [ ] Data fetching / state logic extracted into custom hooks?
- [ ] Props are typed explicitly (no `any`, no untyped spread)?
- [ ] No index-as-key on dynamic lists?
- [ ] No derived state in `useEffect` — use `useMemo`?
- [ ] Shared UI components have no domain logic?
- [ ] File is under 200 lines? If not, can sub-components be extracted?
- [ ] Are loading/error/empty states handled for every async operation?
