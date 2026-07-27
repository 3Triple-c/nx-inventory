# nx-inventory — Build Roadmap

## How to use this

Work phases in order. Don't start Phase 3 because a feature in it sounds fun
while Phase 1 is half-done — the whole point of this sequencing is that each
phase only makes sense once the one before it actually works end-to-end with
real data flowing through it. If you find yourself wanting to jump ahead,
that's usually a sign the current phase feels tedious, not a sign it's done.

Each phase ends with a "you're done when" checklist. If you can't tick every
box, you're not done, even if it feels close.

---

## Phase 0 — Foundation (mostly done)

**Goal:** the plumbing every other phase depends on.

- [x] Monorepo structure (pnpm + Turborepo, one package per module)
- [x] Prisma schema for core modules (catalog, inventory, purchasing, sales,
      transfer, adjustment, supplier, customer, unit, user, warehouse,
      business/membership)
- [x] `applyStockMovement` / `consumeFefo` — the single writer for all stock
      quantity changes
- [x] Events package (`@nx-inventory/events`) with the transactional
      collect-then-flush pattern
- [x] Prisma 7 migration fully settled (Decimal import fixed; driver adapter
      and custom output path — deal with these if/when they actually break,
      per our last conversation)
- [ ] Seed script (`packages/database/src/seed.ts`) with one fake business,
      a handful of products/variants (mix of BATCH and NONE tracking), a
      warehouse, a supplier, a customer — you'll reuse this constantly in
      every phase below, so it's worth 30 minutes now

**You're done when:** you can run `pnpm install && pnpm db:seed` on a clean
machine and have a working Postgres database with realistic-looking data.

---

## Phase 1 — Core inventory loop (the real MVP)

**Goal:** one business, one warehouse, the smallest slice that's actually
useful to a real pharmacy/shop owner: manage products, receive stock, sell
stock, see what's left. This is the "prove the resource abstraction against
one real business" step — don't build the multi-business *UI* (switching
between businesses, invite flows) yet, but don't skip multi-business
*scoping* either.

**Non-negotiable from day one:** every service function takes an explicit
`businessId` parameter, every API route is scoped under it (e.g.
`/api/businesses/:businessId/...`), and the session layer resolves "which
business is this user acting as right now" — even though, in Phase 1, that
resolution always returns their one and only business. Skipping this now
means retrofitting `businessId` into every function signature later, which
is exactly the kind of decision that's cheap today and expensive in six
months. Phase 3 only adds the UI for switching between businesses and the
invite flow — the scoping itself is a Phase 1 concern.

**Backend (thin services, calling what you've already built):**
- [ ] Auth: login/logout/session (`packages/auth`) — email+password is fine,
      OAuth can wait
- [ ] Organisation: create a Business, become its OWNER via Membership
- [ ] Catalog: CRUD for Category, Product, ProductVariant, Unit,
      ProductAttribute — including the trackingMode decision per variant
- [ ] Warehouse: CRUD (single warehouse to start is fine, but don't hardcode
      "only one" anywhere — the schema already supports many)
- [ ] Purchasing: create a Purchase (DRAFT), add items, receive it (calls
      `applyStockMovement`, creates batches as needed)
- [ ] Sales: create a Sale, add items, complete it (calls `consumeFefo` or
      `applyStockMovement`)
- [ ] Stock queries: current stock by warehouse+variant, a simple "low
      stock" list (reorderLevel comparison), batch expiry list

**Frontend (`apps/web`) — functional over pretty:**
- [ ] Login page
- [ ] Product/variant management screens
- [ ] "Receive purchase" flow
- [ ] "Make a sale" flow (simple cart-style UI)
- [ ] Stock dashboard: current levels, low-stock list, expiring-soon list

**You're done when:** you, personally, could hand this to one real pharmacy
or shop and they could run a full day of business on it — receiving stock in
the morning, selling throughout the day, checking what's low before closing.

---

## Phase 2 — Operational completeness

**Goal:** the modules that make the platform usable beyond the happy path.

- [ ] Transfers between warehouses (multi-warehouse becomes real here, not
      just schema-supported)
- [ ] Adjustments (stock count corrections, damage, loss) with the approval
      workflow (`approvedById`/`approvedAt`) actually enforced in the API,
      not just present in the schema
- [ ] Returns — you have `RETURN_IN`/`RETURN_OUT` movement types in the enum
      but no explicit Return model yet. Decide now: is a return a new model
      (`Return`/`ReturnItem`) referencing the original Sale/Purchase, or is
      it just another Adjustment with a specific type? I'd lean toward a
      real `Return` model since it needs its own reference back to the
      original sale — worth a short design pass before building it
- [ ] Suppliers and Customers: full CRUD, purchase/sales history per entity
- [ ] Notifications actually wired: `registerNotificationHandlers()` sends a
      real notification (start with email or just a persisted in-app
      notification row — WhatsApp/Telegram can come in Phase 6)

**You're done when:** every enum value and every relation in your current
schema is exercised by real application code somewhere — nothing is schema
that no service ever touches.

---

## Phase 3 — Multi-tenancy & permissions hardening

**Goal:** the "one account, many businesses" vision actually works, and
access control is enforced everywhere, not just at the UI layer.

- [ ] A user can own/belong to multiple Businesses, switch between them in
      the UI
- [ ] Invite flow: OWNER/ADMIN invites a MANAGER/STAFF member to a specific
      business
- [ ] `permissions` package wired into every API route — every request
      checks "can this user do this action on this business's data," not
      just "is this user logged in"
- [ ] Explicit test: log in as a user in Business A, try to fetch/mutate
      Business B's data by ID — confirm it's rejected. Do this for every
      resource type, not just one. This is the single most important test
      in the whole project, since a leak here means Pharmacy A can see
      Poultry Farm B's sales data.

**You're done when:** the cross-tenant leak test above passes for every
resource type, and you could plausibly onboard a second unrelated business
without touching code.

---

## Phase 4 — Reporting & analytics

**Goal:** answer the questions from your original vision doc — "what sold
most this week," "what hasn't moved in 90 days," "which branch is
underperforming" — using the `StockMovement` ledger and business data you
already have. Keep this SQL-and-charts simple before anything AI-flavored.

- [ ] Sales summary (by day/week/month, by product, by warehouse)
- [ ] Stock aging report (days since last movement)
- [ ] Reorder/expiry dashboards (upgrading the Phase 1 lists into real views)
- [ ] Supplier performance (on-time delivery, price trends)

**You're done when:** every example question from your original vision doc
has a real screen or query that answers it — without needing AI to get
there.

---

## Phase 5 — AI layer

**Goal:** natural-language interface over what already works. This is
where "AI is not the product" gets tested for real — the AI package should
call the *same* service functions (`StockService`, `SalesService`, etc.)
that your UI calls, via tool use, never touching the database directly and
never bypassing `applyStockMovement`.

- [ ] Tool-calling setup in `packages/ai` — define tools that wrap your
      existing services (`getStockLevel`, `getLowStockItems`,
      `getSalesSummary`, etc.), not raw Prisma queries
- [ ] `ChatService` answering the example questions from the vision doc
      through those tools
- [ ] `InsightService` — proactive stuff ("why is stock reducing quickly")
      built on top of the analytics queries from Phase 4

**You're done when:** you can turn the AI package off entirely and the
platform still fully works — because every AI answer is just a
conversational wrapper over something that already existed.

---

## Phase 6 — Multi-channel

**Goal:** the "answer inside WhatsApp" part of your vision.

- [ ] `integrations` package: WhatsApp first (highest value for your likely
      early users), then Telegram/Slack if there's demand
- [ ] These are thin adapters — they call the same `ai`/service layer,
      they don't reimplement anything

**You're done when:** a real low-stock notification or a "how much X do we
have" answer can round-trip through WhatsApp, not just the web UI.

---

## Phase 7 — SaaS productization

**Goal:** this stops being "your project" and becomes a thing strangers can
sign up for and pay for.

- [ ] Billing/plans (per-business or per-account tiers — decide which
      modules are gated behind which plan)
- [ ] Onboarding flow for a brand-new business (guided setup: first
      warehouse, first products, invite team)
- [ ] Public marketing site content (separate from `apps/web`'s app itself,
      or a route within it)
- [ ] Admin/superadmin tooling for you to support customers (impersonation,
      usage stats, support tickets)
- [ ] `sdk` and public API — only once you have external users who actually
      want to integrate; don't build this speculatively

**You're done when:** someone who isn't you can sign up, pay, onboard their
business, and use the platform without you doing anything manual on the
backend.

---

## Things deliberately left out for now

- `finance` package (Expense/Income/Account) — stub until Phase 2 or 3
  reveals real demand for it; don't build a general ledger speculatively
- `sdk`/public API — Phase 7, only with real external demand
- Serial-number tracking (`TrackingMode.SERIAL`) — the enum exists but
  there's no `SerialNumber` model yet; add it if/when a real use case
  (electronics, asset tracking) shows up

Building these before there's a concrete driver for them is exactly the kind
of scope creep that turns a solo project into something that never ships.
