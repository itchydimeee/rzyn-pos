# R-ZYN POS System — Project Plan

A simple, offline-friendly Point of Sale system built for a single grocery store, running on a tablet, with an admin side for managing products, stocks, cashiers, and reports.

---

## 1. Overview

- **Type:** Web app (works on tablet browser, no app store needed)
- **Users:** Admin (1 account) and Cashiers (created by Admin)
- **Login:** User picks "Login as Admin" or "Login as Cashier", then enters username + code
- **Payments:** Cash and GCash (manual confirm, no direct GCash API)
- **No receipt printer or barcode scanner for now** — product search and product cards are the main way to add items
- **Database:** Supabase (free tier is enough for this store's size)

---

## 2. Tech Stack

| Part | Tool | Why |
|---|---|---|
| Frontend + Backend | Next.js (App Router, API routes) | One project, easy to build and manage, no need for a separate backend at this size |
| Database | Supabase (Postgres) | Free tier, no server setup needed |
| ORM | Prisma | Easy to read and write database code, works well with Next.js |
| Server State | TanStack React Query | Caching, optimistic mutations, loading states, auto-refetch — replaces raw `useEffect`+`fetch` patterns |
| UI Components | shadcn/ui | Clean, ready-made components (buttons, modals, tables) |
| Icons | lucide-react | Simple icon set that matches shadcn |
| Auth | Custom (username + 6-digit code) | No need for outside auth service, small user count |
| Hosting | Vercel (free tier) | Works well with Next.js, tablet just opens the site in a browser |

**Why serverless Next.js and not a separate backend (Express/Nest):**
This store has around 100+ products with a few variants each. That is a small amount of data. A separate backend is only needed when there are many users, heavy traffic, or multiple different apps sharing one backend (like a future mobile app). None of that applies here. Serverless Next.js is simpler, faster to build, and does the job well. If the business grows a lot later (multiple branches, own mobile app), the backend can be split out at that time.

If a separate backend was needed, Express is the better pick over Nest for this project size. Nest is built for large teams and big codebases, with more structure and more rules to follow. Express is simpler and does the same job without the extra overhead — better fit for a small team.

---

## 3. User Roles

### Admin (1 account)
- Full access to everything
- Can create, edit, delete cashiers
- Can reset a cashier's 6-digit code
- Can turn on/off a cashier's stock edit permission
- Can add, edit, delete products and variants
- Can view all reports and stock history

### Cashier (created by Admin)
- Logs in with username + 6-digit code
- Can use the POS (Product Page) to process sales
- Can log expenses (deliveries, bills, other costs)
- Can edit stock **only if Admin gave permission**
- All actions are tracked with their user ID

---

## 4. Pages

### Cashier Side

**1. Product Page (POS / Checkout)**
- Grid of product cards
- Search bar (search by product name or code)
- Click a card → if it has variants (like 200g, 500g, 1kg), show a variant picker
- Add item to cart, adjust quantity
- Cart shows running total
- Checkout: choose Cash or GCash
- Confirmation modal before finishing the sale (prevents accidental checkout)
- Toast message on successful sale

**2. Expenses Page**
- Shows list of today's logged expenses
- "Add Expense" button opens a modal
- Expense types: Delivery, Bill, Rent, Supplies, Other
- If type is "Delivery":
  - Modal shows a product + variant selector and a quantity field
  - Saving this automatically adds the delivered quantity to that variant's stock
- If type is Bill/Rent/Supplies/Other:
  - Just amount and a note field
- Confirmation modal before saving
- Toast message on save

**3. Stocks Page**
- Only visible/usable if Admin turned on stock permission for that cashier
- Shows list of products/variants with current stock count
- Cashier can edit stock number, must enter a reason (example: "damaged", "miscount")
- Every change is saved to a Stock Log, tagged with the cashier's name and time
- Confirmation modal before saving
- Toast message on save

### Admin Side

**1. Dashboard**
- Today's total sales
- Today's total profit
- Today's total expenses
- Simple sales chart (last 7 days)
- Low stock warning list (based on each variant's own low-stock number)
- Top selling products this week

**2. Products Page**
- Table of all products, can expand to see variants
- Add new product (with variants: name, sell price, cost price, stock, low-stock number)
- Edit product/variant details
- Delete product — this is a **soft delete** (marked inactive, not removed), so past sales reports stay correct
- Confirmation modal before delete
- Toast message on save/delete

**3. Stocks Page**
- Same stock editing as cashier's version, but Admin can always edit
- Full stock change history is visible here — shows which user made each change, when, and why

**4. Cashiers Page**
- List of all cashiers
- Add new cashier (set username + 6-digit code)
- Reset a cashier's 6-digit code (in case they forget it)
- Turn stock permission on/off per cashier
- Deactivate/delete a cashier's access
- Confirmation modal before deleting/deactivating
- Toast message on save

**5. Reports Page**
- Filter by: Daily / Weekly / Monthly
- Shows: Total Sales, Total Profit, Expense Breakdown (by type)
- Export button to download the report as an Excel file

---

## 5. Database Structure (Prisma Models)

**User**
- id
- username
- code (hashed 6-digit code)
- role (admin / cashier)
- stockPermission (true/false)
- isActive (true/false)

**Product**
- id
- name
- category
- isActive (for soft delete)

**ProductVariant**
- id
- productId
- name (example: "500g")
- sellPrice
- costPrice
- stock
- lowStockThreshold
- barcode (optional field, ready for future use)

**Transaction**
- id
- cashierId
- total
- paymentType (cash / gcash)
- createdAt

**TransactionItem**
- id
- transactionId
- variantId
- quantity
- priceAtSale

**Expense**
- id
- type (delivery / bill / rent / supplies / other)
- amount
- note
- cashierId
- createdAt

**ExpenseDelivery**
- id
- expenseId
- variantId
- quantityDelivered

**StockLog**
- id
- variantId
- userId
- changeAmount
- reason
- createdAt

---

## 6. Key Features Recap

- Product variants support (sizes, weights, etc.)
- Cost price tracked per variant, so profit is calculated correctly (not just sales total)
- Low stock alert set individually per variant
- Expense tracking, including deliveries that auto-update stock
- Full stock change history, tracked by user
- Cashier code reset by Admin
- Soft delete on products, keeps old reports accurate
- Toast notifications on all actions
- Confirmation modals before delete, update, or checkout — prevents accidental clicks
- Optimistic UI updates on all mutations — the interface updates immediately before the server confirms, then rolls back on failure

---

## 6.1 TanStack React Query Conventions

**Server state library used across the entire app. All data fetching and mutations go through it — never raw `useEffect`+`fetch`.**

### Query Keys

- Located in `src/app/_lib/query/queryKeys.ts`
- Hierarchical, namespaced keys: `["admin", "products"]`, `["admin", "cashiers"]`, `["products"]`, `["expenses"]`
- Use `byId(id)` factory for single-item caches
- Use `withParams(...)` for parameterized queries (reports)

### Queries (`useQuery`)

- One query hook per data source: `useDashboard()`, `useProducts()`, `useExpenses()`, etc.
- All query hooks live in `src/app/_lib/query/queries/`
- Default `staleTime: 30_000` (30s) — products use `15_000` (15s) since they change more often during POS operations
- `refetchOnWindowFocus: false` — POS is always open, no need to refetch on focus

### Mutations (`useMutation`)

- One mutation hook per operation: `useCheckout()`, `useCreateProduct()`, `useStockEdit()`, etc.
- All mutation hooks live in `src/app/_lib/query/mutations/`
- **Every mutation follows the optimistic update pattern:**
  1. `onMutate`: Cancel in-flight queries, snapshot previous data, optimistically update cache, show `toast.loading()`
  2. `onError`: Rollback cache to snapshot, show `toast.error()`, call `onRollback?.()` to re-open modals
  3. `onSuccess`: Show `toast.success()`, call `onSuccess?.()` to close modals
  4. `onSettled`: `invalidateQueries()` to sync with server truth
- Mutation hooks accept `onSuccess` and `onRollback` callbacks for modal lifecycle management

### Optimistic Patterns

| Pattern | Used For | How |
|---|---|---|
| **Insert** | Create product, create cashier, create expense, checkout | Push to cache list with temp ID (`temp-${Date.now()}`), replaced on `onSettled` invalidation |
| **Update** | Edit product, edit cashier, stock edit | Map-replace in cache list, also touch `byId` cache |
| **Delete** | Soft-delete product, deactivate cashier | Filter out from cache list |
| **Stock decrement** | Checkout, manual stock edit | Decrement `stock` field in product variant cache immediately |

### Button Loading States

- Every mutation button uses the pattern: `disabled={mutation.isPending}` + `<Spinner />` while pending
- Text changes from action label → "Processing..." / "Saving..." while pending
- Import `Spinner` from `@/app/_lib/query/Spinner`

### Modal + Optimistic Flow

- Modal closes on `onSuccess` callback passed to mutation hook
- Modal re-opens on `onRollback` callback if mutation fails
- For forms: save `editingTarget` in a ref before closing so values can be restored on rollback

### Offline Integration

- Mutations (checkout, expense, stockEdit) try the API first
- If network is down (`fetch` throws `TypeError` or `useOnlineStatus().status === "offline"`), the action is queued to IndexedDB via `offlineDB.pendingActions`
- `useOnlineStatus` syncs pending actions on reconnect and calls `queryClient.invalidateQueries()` to refresh all cached data
- Admin-side mutations (product/cashier CRUD) are online-only — no offline queue

### Toasts

- Sonner handles all notifications
- Manual toast lifecycle: `toast.loading()` in `onMutate`, update with same ID in `onSuccess`/`onError`
- Use `useRef<string | number>(0)` for toast ID tracking

### File Organization

```
src/app/_lib/query/
├── queryClient.ts          # QueryClient singleton
├── queryKeys.ts            # Hierarchical key factory
├── fetcher.ts              # Fetch wrapper (get/post/put/del)
├── Spinner.tsx             # Loading spinner component
├── queries/                # useQuery hooks
│   ├── useDashboard.ts
│   ├── useProducts.ts
│   ├── useAdminProducts.ts
│   ├── useCashiers.ts
│   ├── useExpenses.ts
│   ├── useReports.ts
│   └── useStockLogs.ts
└── mutations/              # useMutation hooks
    ├── useCheckout.ts
    ├── useCreateProduct.ts
    ├── useUpdateProduct.ts
    ├── useDeleteProduct.ts
    ├── useCreateCashier.ts
    ├── useUpdateCashier.ts
    ├── useCreateExpense.ts
    └── useStockEdit.ts
```

---

## 7. Build Phases

**Phase 1 — Foundation**
- Set up Next.js + Prisma + Supabase connection
- Build login system (Admin/Cashier selection, username + code)

**Phase 2 — Product & Stock Management**
- Products page (Admin): add/edit/delete, variants, cost price, low stock number
- Stocks page (Admin and Cashier): view and edit stock, stock log

**Phase 3 — POS / Checkout**
- Product Page: cards, search, variant picker, cart, checkout flow

**Phase 4 — Expenses**
- Expenses page: add expense modal, delivery auto-updates stock

**Phase 5 — Cashier Management**
- Cashiers page (Admin): add, reset code, toggle stock permission, deactivate

**Phase 6 — Reports & Dashboard**
- Dashboard KPIs and chart
- Reports page: daily/weekly/monthly filters, Excel export

**Phase 7 — Polish & Testing**
- Toasts and confirmation modals across all actions
- Optimistic UI with TanStack React Query (migrated from raw fetch — see Section 6.1 for conventions)
- Button spinners and loading states on all mutation buttons
- Test on actual tablet and store wifi

---

## 8. Offline Mode (No Internet / Power Backup)

**Problem:** A web app can't open a real SQLite file in the browser. Browsers block this for safety.

**Fix:** Use IndexedDB instead. It's a database already built into every browser. Same idea as SQLite — saves data on the tablet, works with no internet.

**Why this is a good fit:**
- If wifi goes down, tablet still works on its own. No extra local server needed.
- If power goes out, only the tablet matters (it has a battery). No PC to worry about staying on.

**How it works:**
1. **Internet is up:** App saves data straight to Supabase, like normal.
2. **Internet is down:** App saves data to IndexedDB on the tablet instead. Sales, expenses, and stock edits still work the same way. Cashier does not notice a difference.
3. **Internet comes back:** App checks IndexedDB for anything not yet saved to Supabase. Sends it over, then clears it from IndexedDB.
4. Small status badge on screen: "Offline" when not connected, "Syncing..." when catching up.

**About conflicts:** Since there is only one POS tablet, there is no risk of two devices saving different changes to the same stock at the same time. Sync is simple — just send whatever happened offline, in order, to Supabase. No conflict fixing needed. This would only get harder if there were multiple POS tablets in the future.

**What needs offline support:**
- Checkout / sales
- Expenses
- Stock edits
- Product list (must be downloaded and saved ahead of time, so cashier can still see products while offline)

**What does not need offline support:**
- Reports and Dashboard (Admin side) — these can just show the last synced data when offline, since they are not urgent.

---

## 9. Notes for Later (Optional Future Upgrades)

- Barcode scanner support (already has a `barcode` field ready in the database)
- Receipt printer support
- Multiple branches/stores
- GCash direct payment API integration