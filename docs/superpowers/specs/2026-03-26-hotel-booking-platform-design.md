# Hotel Booking Platform — Design Specification

**Date:** 2026-03-26
**Status:** Draft
**Type:** Full-stack web application
**Comparable to:** Traveloka / Airbnb hybrid

---

## 1. Overview

A property rental and booking marketplace supporting hotels, resorts, condos, and rental houses in Thailand. Guests can book stays from a single night to multiple months. The platform supports both domestic Thai travelers and international tourists.

### Two-sided marketplace

- **Hosts** self-list properties via a dashboard or are onboarded by the platform team as partners.
- **Guests** search, browse, and book properties with flexible payment options.
- **Admins** approve listings, manage users, oversee bookings, and monitor revenue.

### MVP scope

Included: property listings, search with map, booking, payments (Opn + Stripe), host dashboard, admin panel, Channex inventory sync, smart pricing suggestions, email notifications, Thai + English i18n.

Excluded: reviews/ratings, in-app messaging, mobile app, Go microservice, Elasticsearch.

---

## 2. Tech Stack

| Layer | Choice | Purpose |
|---|---|---|
| Framework | Next.js 16 + Turbopack | SSR, API routes, server actions |
| Styling | Tailwind CSS | Utility-first CSS |
| Client state | TanStack Query | Server state caching, mutations, optimistic updates |
| Auth | Supabase Auth | Email/password, Google OAuth, session management |
| Database | Supabase Postgres + PostGIS | Relational data + geo-spatial queries |
| ORM | Drizzle ORM | Type-safe queries, migrations |
| Validation | Zod | Runtime input validation |
| Caching | Upstash Redis | Search cache, rate limiting, checkout locks |
| Images | Cloudinary | Storage, optimization, CDN, responsive transforms |
| Payments (Thai) | Opn Payments | PromptPay, TrueMoney, Thai bank cards/installments |
| Payments (International) | Stripe | International credit/debit cards |
| Email | Resend + React Email | Transactional emails with bilingual templates |
| Bot protection | Cloudflare Turnstile | Login, register, checkout |
| Maps | Leaflet + OpenStreetMap | Map view for property search |
| i18n | next-intl | URL-based locale routing (th, en) |
| Deployment | Vercel | Hosting, CDN, cron jobs |

---

## 3. Architecture

Monolithic Next.js application with strict internal module boundaries. Each module has its own actions, queries, components, validators, tests, and a barrel `index.ts` for public API.

### Project structure

```
hotel-booking/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── callback/page.tsx
│   │   │   └── layout.tsx                # Minimal centered layout
│   │   ├── (guest)/
│   │   │   ├── page.tsx                  # Homepage — search, featured
│   │   │   ├── search/
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── property/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── loading.tsx
│   │   │   │       └── not-found.tsx
│   │   │   ├── booking/
│   │   │   │   ├── checkout/
│   │   │   │   │   └── [propertyId]/
│   │   │   │   │       └── page.tsx      # Dates + guests via search params
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx          # Booking status
│   │   │   ├── account/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── bookings/page.tsx
│   │   │   │   └── become-host/page.tsx  # Upgrade to host
│   │   │   └── layout.tsx
│   │   ├── (host)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── properties/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── edit/page.tsx
│   │   │   │       ├── calendar/page.tsx
│   │   │   │       └── pricing/page.tsx
│   │   │   ├── bookings/page.tsx
│   │   │   ├── payouts/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── properties/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── bookings/page.tsx
│   │   │   ├── finance/page.tsx
│   │   │   └── layout.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── opn/route.ts              # Raw body for signature verification
│   │   │   ├── stripe/route.ts           # Raw body for signature verification
│   │   │   └── channex/route.ts
│   │   ├── upload/
│   │   │   └── signature/route.ts        # Cloudinary upload signature
│   │   └── cron/
│   │       ├── payouts/route.ts
│   │       └── pricing/route.ts
│   ├── error.tsx
│   ├── not-found.tsx
│   └── layout.tsx
├── src/
│   ├── modules/
│   │   ├── property/
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── components/
│   │   │   ├── validators/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── booking/
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── components/
│   │   │   ├── validators/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── payment/
│   │   │   ├── providers/
│   │   │   │   ├── opn.ts
│   │   │   │   ├── stripe.ts
│   │   │   │   └── factory.ts
│   │   │   ├── actions/
│   │   │   ├── validators/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── payout/
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── search/
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── components/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── inventory/
│   │   │   ├── channex/
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── pricing/
│   │   │   ├── engine/
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── notification/
│   │   │   ├── templates/
│   │   │   ├── actions/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── user/
│   │   │   ├── actions/
│   │   │   ├── queries/
│   │   │   ├── __tests__/
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── admin/
│   │       ├── actions/
│   │       ├── queries/
│   │       ├── __tests__/
│   │       ├── types.ts
│   │       └── index.ts
│   ├── shared/
│   │   ├── db/
│   │   │   ├── schema/
│   │   │   │   ├── user.ts
│   │   │   │   ├── property.ts
│   │   │   │   ├── booking.ts
│   │   │   │   ├── payment.ts
│   │   │   │   ├── payout.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   ├── index.ts
│   │   │   └── seed.ts
│   │   ├── ui/
│   │   │   └── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── server.ts
│   │   │   │   ├── client.ts
│   │   │   │   └── middleware.ts
│   │   │   ├── redis.ts
│   │   │   ├── cloudinary.ts
│   │   │   ├── resend.ts
│   │   │   └── logger.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   └── rate-limit.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── validators/
│   │       └── index.ts
│   └── config/
│       ├── constants.ts
│       ├── env.server.ts
│       └── env.client.ts
├── e2e/
│   ├── search.spec.ts
│   ├── booking.spec.ts
│   └── payment.spec.ts
├── messages/
│   ├── th.json
│   └── en.json
├── drizzle.config.ts
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── vercel.json
└── package.json
```

---

## 4. Database Schema

### Required extensions

```sql
CREATE EXTENSION IF NOT EXISTS postgis;       -- geo-spatial queries
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy text search / autocomplete
CREATE EXTENSION IF NOT EXISTS btree_gist;    -- EXCLUDE constraints on seasonal_pricing
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- encryption for sensitive fields
```

### Auto-update trigger

```sql
-- Automatically update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to all tables with updated_at column:
-- CREATE TRIGGER set_updated_at BEFORE UPDATE ON <table>
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Users & Auth

```sql
-- Users (synced from Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY,                    -- from Supabase Auth
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'   -- active, suspended, banned
    CHECK (status IN ('active', 'suspended', 'banned')),
  preferred_locale TEXT NOT NULL DEFAULT 'th'
    CHECK (preferred_locale IN ('th', 'en')),
  preferred_currency TEXT NOT NULL DEFAULT 'THB'
    CHECK (preferred_currency IN ('THB', 'USD')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Multi-role support (guest can also be host)
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('guest', 'host', 'admin')),
  PRIMARY KEY (user_id, role)
);

-- Host-specific profile (created when user upgrades to host)
CREATE TABLE host_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT,
  tax_id TEXT,                            -- encrypted via pgcrypto
  opn_connect_id TEXT,                    -- Opn stores bank details
  stripe_connect_id TEXT,                 -- Stripe stores bank details
  commission_rate DECIMAL(4,2) NOT NULL DEFAULT 0.15,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Properties

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES host_profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('hotel', 'resort', 'condo', 'rental_house')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'active', 'suspended', 'archived')),
  booking_mode TEXT NOT NULL DEFAULT 'instant'
    CHECK (booking_mode IN ('instant', 'request')),
  payment_policy TEXT NOT NULL DEFAULT 'full_upfront'
    CHECK (payment_policy IN ('full_upfront', 'deposit', 'monthly')),
  cancellation_policy TEXT NOT NULL DEFAULT 'moderate'
    CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict', 'non_refundable')),
  channex_property_id TEXT,               -- null = platform-only
  pet_friendly BOOLEAN NOT NULL DEFAULT FALSE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE property_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('th', 'en')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  UNIQUE (property_id, locale)
);

CREATE TABLE property_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  cloudinary_id TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  alt_text TEXT
);

CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE amenity_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('th', 'en')),
  name TEXT NOT NULL,
  UNIQUE (amenity_id, locale)
);

CREATE TABLE property_amenities (
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);
```

### Room Types

```sql
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  total_units INT NOT NULL DEFAULT 1,     -- 1 for condo/house, N for hotel
  max_guests INT NOT NULL,
  bedrooms INT NOT NULL DEFAULT 1,
  bathrooms INT NOT NULL DEFAULT 1,
  min_stay_nights INT NOT NULL DEFAULT 1,
  max_stay_nights INT,                    -- null = no limit
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE room_type_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('th', 'en')),
  name TEXT NOT NULL,
  description TEXT,
  UNIQUE (room_type_id, locale)
);

CREATE TABLE room_type_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  cloudinary_id TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
```

### Pricing

```sql
CREATE TABLE room_type_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID UNIQUE NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  nightly_rate DECIMAL(12,2) NOT NULL,
  weekly_discount DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  monthly_discount DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  deposit_percentage DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'THB'
    CHECK (currency IN ('THB', 'USD'))
);

CREATE TABLE seasonal_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  nightly_rate DECIMAL(12,2) NOT NULL,
  -- Constraint: no overlapping date ranges per room_type
  EXCLUDE USING gist (
    room_type_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  )
);

CREATE TABLE pricing_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  suggested_rate DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Availability

```sql
CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_count INT NOT NULL DEFAULT 0
    CHECK (available_count >= 0),          -- prevents overbooking at DB level
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'blocked')),
  source TEXT NOT NULL DEFAULT 'platform'
    CHECK (source IN ('platform', 'channex')),
  UNIQUE (room_type_id, date)
);
```

### Bookings

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INT NOT NULL,
  rooms_count INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN (
      'pending_approval', 'pending_payment', 'confirmed', 'checked_in',
      'completed', 'cancelled', 'rejected'
    )),
  booking_mode TEXT NOT NULL
    CHECK (booking_mode IN ('instant', 'request')),
  cancellation_policy TEXT NOT NULL,       -- snapshot at booking time
  payment_policy TEXT NOT NULL,            -- snapshot at booking time
  total_amount DECIMAL(12,2) NOT NULL,
  deposit_amount DECIMAL(12,2),
  currency TEXT NOT NULL CHECK (currency IN ('THB', 'USD')),
  special_requests TEXT,
  approved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out > check_in)
);
```

### Payments & Payouts

```sql
-- NOTE: transactions must be defined before payment_schedule (FK dependency)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  provider TEXT NOT NULL CHECK (provider IN ('opn', 'stripe')),
  provider_tx_id TEXT NOT NULL,
  provider_event_id TEXT,                  -- for webhook deduplication
  type TEXT NOT NULL
    CHECK (type IN ('charge', 'refund', 'deposit', 'installment')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('THB', 'USD')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  idempotency_key TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)     -- prevent duplicate webhook processing
);

CREATE TABLE payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'paid', 'overdue', 'failed')),
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES host_profiles(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  gross_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  net_amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('THB', 'USD')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'hold', 'processing', 'completed', 'failed')),
  hold_until TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Audit Log

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,               -- 'booking', 'transaction', 'payout'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,                    -- 'status_changed', 'amount_updated'
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES users(id), -- null = system action
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — audit logs are immutable
);
```

### Indexes

```sql
-- PostGIS spatial index for map search
CREATE INDEX idx_properties_location ON properties USING GIST (location);

-- Full-text search — separate indexes per language
CREATE INDEX idx_property_translations_search_en ON property_translations
  USING GIN (to_tsvector('english', name || ' ' || description))
  WHERE locale = 'en';

CREATE INDEX idx_property_translations_search_th ON property_translations
  USING GIN (to_tsvector('simple', name || ' ' || description))
  WHERE locale = 'th';

-- Availability lookups (most frequent query)
CREATE INDEX idx_availability_room_date ON availability (room_type_id, date, status);

-- Booking lookups
CREATE INDEX idx_bookings_guest ON bookings (guest_id, status);
CREATE INDEX idx_bookings_property ON bookings (property_id, status);

-- Audit log
CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id);

-- Active properties only (partial index)
CREATE INDEX idx_properties_active ON properties (type, pet_friendly)
  WHERE status = 'active';

-- Transactions by booking
CREATE INDEX idx_transactions_booking ON transactions (booking_id);

-- Payouts: cron job finds held payouts past hold_until
CREATE INDEX idx_payouts_hold ON payouts (status, hold_until)
  WHERE status = 'hold';

-- Autocomplete: trigram index on city/province
CREATE INDEX idx_property_translations_trgm ON property_translations
  USING GIN ((city || ' ' || province) gin_trgm_ops);
```

---

## 5. Authentication & Authorization

### Auth flow

- Supabase Auth handles signup/login (email + password, Google OAuth).
- On signup, a `users` record is created with `guest` role via database trigger.
- "Become a host" flow adds `host` role to `user_roles` and creates `host_profiles` record.
- Admin role is assigned manually (never self-service).

### Route protection

| Route group | Required role | Additional checks |
|---|---|---|
| `(auth)/*` | Unauthenticated only | Redirect to home if logged in |
| `(guest)/*` | Public (most pages) | Account pages require `guest` role |
| `(host)/*` | `host` role | Must have verified `host_profiles` |
| `(admin)/*` | `admin` role | — |
| `api/webhooks/*` | None | Verify provider signature |
| `api/cron/*` | None | Verify Vercel cron secret header |

### Row Level Security (RLS)

Note: `properties.host_id` references `host_profiles(id)`, not `users(id)`. RLS policies must join through `host_profiles` to match `auth.uid()`.

```
properties:   host_id IN (SELECT id FROM host_profiles WHERE user_id = auth.uid())
              OR status = 'active' (public read for guests)
bookings:     guest_id = auth.uid()
              OR property_id IN (SELECT p.id FROM properties p
                 JOIN host_profiles hp ON p.host_id = hp.id
                 WHERE hp.user_id = auth.uid())
transactions: booking_id IN (SELECT id FROM bookings WHERE guest_id = auth.uid()
              OR property owner via join)
payouts:      host_id IN (SELECT id FROM host_profiles WHERE user_id = auth.uid())
audit_log:    admin role only
```

### Security layers

1. **Middleware** — route protection, locale detection, rate limiting
2. **RLS** — database-level access control
3. **Server actions** — Zod validation + ownership checks
4. **Rate limiting** — per-route via Upstash Redis
5. **Bot protection** — Cloudflare Turnstile on login, register, checkout
6. **CSRF** — built-in via Next.js server actions

### Rate limits

| Endpoint | Limit | Window |
|---|---|---|
| Login / Register | 5 requests | 1 min |
| Forgot password | 3 requests | 5 min |
| Search | 30 requests | 1 min |
| Create booking | 10 requests | 1 min |
| Payment initiation | 5 requests | 1 min |
| Image upload | 20 requests | 5 min |
| Webhooks | 100 requests | 1 min |

---

## 6. Payment Architecture

### Provider selection

```
PromptPay, TrueMoney, Thai bank installments → Opn
International credit/debit cards             → Stripe
Thai credit/debit cards                      → Opn (lower fees)
```

### Payment abstraction

```typescript
interface PaymentProvider {
  createCharge(amount, currency, method, metadata): Promise<ChargeResult>
  verifyWebhook(rawBody, signature): WebhookEvent
  refund(transactionId, amount): Promise<RefundResult>
  createConnectAccount(hostId): Promise<string>
  createPayout(connectAccountId, amount): Promise<PayoutResult>
}
```

A factory function selects the correct provider based on payment method.

### Instant booking flow

1. Guest clicks "Book Now"
2. Server action validates input (Zod), including `guests_count <= rooms_count * max_guests`
3. Redis lock: soft UX lock to prevent concurrent checkouts (TTL: 15 min)
4. Decrement `available_count` in database (DB constraint `>= 0` is the true overbooking guard)
5. Create booking record (status: `pending_payment`)
6. Create `payment_schedule` records if monthly
7. Redirect to payment page
8. Guest pays via Opn or Stripe
9. Webhook confirms payment → transaction created → booking status: `confirmed`
10. Redis lock released
11. Confirmation email sent
12. Payment failure/expiry → booking cancelled, `available_count` restored, lock released

Note: availability is decremented at step 4 (not after payment) because payment confirmation can be delayed (especially PromptPay/bank transfers). The database `available_count >= 0` constraint is the authoritative overbooking guard; the Redis lock is a soft UX lock only.

### Request-to-book flow

1–3. Same as instant booking
4. Booking created (status: `pending_approval`)
5. Email sent to host
6. Host approves → `confirmed` → guest receives payment link
7. Host declines → `rejected` → lock released
8. 24h timeout → auto-reject
9–12. Same as instant booking

### Payout flow

1. Guest checks in → `checked_in`
2. Payout created (status: `hold`, hold_until: check_in + 48h)
3. Hourly cron finds payouts past `hold_until`
4. Commission deducted: `gross_amount × commission_rate`
5. Net payout processed via Opn Connect / Stripe Connect
6. Payout status: `completed`, email sent to host

### Monthly stay payouts

1. Payment schedule created per month
2. Each due date triggers guest charge
3. Successful charge → payout to host (with 48h hold)
4. Failed charge → notify guest, retry after 3 days, escalate to admin

### Refund policy

| Policy | >= 14 days | >= 7 days | >= 5 days | >= 24h | < 24h |
|---|---|---|---|---|---|
| Flexible | 100% | 100% | 100% | 100% | 0% |
| Moderate | 100% | 100% | 100% | 0% | 0% |
| Strict | 100% | 50% | 50% | 0% | 0% |
| Non-refundable | 0% | 0% | 0% | 0% | 0% |

### Payment security

- Card data never touches our server (Opn/Stripe tokenization)
- Webhook signature verification on every endpoint
- Webhook deduplication via `provider_event_id` unique constraint on `transactions`
- Idempotency keys on all charges and refunds
- Server-side price recalculation before charging
- Currency mismatch validation
- Guest count validation: `guests_count <= rooms_count * max_guests`

---

## 7. Search & Discovery

### Search query flow

1. Guest enters filters → TanStack Query with debounced input
2. Server action validates filters (Zod)
3. Check Redis cache (TTL: 5 min)
4. Build Drizzle query:
   - PostGIS `ST_DWithin` for area search
   - Property type, pet_friendly, amenities filters
   - Availability join: `available_count > 0` for all requested dates
   - Price calculation (base + seasonal + discounts)
   - Full-text search on `property_translations` (locale-aware)
5. Cache result in Redis
6. Return cursor-paginated results

### Map view

- Viewport bounds → PostGIS `ST_Within` + `ST_MakeEnvelope`
- Debounced 300ms on pan/zoom
- Server-side clustering when zoomed out
- Client-side clustering for <100 results

### Search filters

| Filter | Implementation |
|---|---|
| Location | PostGIS geo query |
| Dates | availability table join |
| Guests | room_types.max_guests |
| Property type | enum filter |
| Price range | calculated nightly rate |
| Amenities | property_amenities join |
| Pet friendly | boolean filter |
| Stay duration | min/max_stay_nights |
| Rooms count | room_types.total_units |
| Booking mode | enum filter |

### Autocomplete

- `pg_trgm` similarity search on city/province names
- Redis cache for popular searches
- Debounced 200ms, top 5 suggestions

### Performance

- Cursor-based pagination (not offset)
- Partial indexes on active properties only
- Pre-computed property card data to reduce JOINs
- Prefetch property detail on card hover (TanStack Query)

---

## 8. Inventory & Channel Management

### Platform-only properties (manual)

- Host manages availability via calendar UI
- Booking confirmed → `available_count` decremented
- Booking cancelled → `available_count` restored
- Double-booking prevention:
  - Redis lock during checkout (TTL: 15 min)
  - Database constraint: `available_count >= 0`
  - Optimistic locking: `UPDATE ... WHERE available_count > 0`

### Channex-synced properties

**Initial setup:**
1. Host connects Channex account
2. `channex_property_id` stored on property
3. Full availability pull via Channex API
4. Room type mapping

**Ongoing two-way sync:**
- **Inbound:** Channex webhook → update availability (source: `channex`)
- **Outbound:** Our booking confirmed → push to Channex API → propagates to OTAs
  - If Channex push fails: booking remains confirmed on our platform, retry with exponential backoff (max 5 attempts), alert admin after repeated failures

### Conflict handling

Race condition (simultaneous booking on our site + another OTA):
1. Our checkout holds Redis lock
2. Channex webhook arrives saying room booked elsewhere
3. Fail our checkout, notify guest "room just became unavailable"
4. Redirect guest to search

### Sync reliability

- Channex retries webhooks with exponential backoff
- Cron: full availability sync every 6 hours (safety net)
- Alert admin if no webhook received for 24h for active Channex property

---

## 9. Pricing Engine

### Price calculation

```
For each night of stay:
  rate = seasonal_rate (if date in range) OR base_rate

Apply discount:
  if stay >= 28 nights: monthly_discount
  else if stay >= 7 nights: weekly_discount

nightly_total = rate × (1 - discount)
total = sum of all nightly_totals
```

### Smart pricing suggestions (advisory only)

- Daily cron analyzes: booking rate, area demand, day-of-week patterns
- Generates suggestions stored in `pricing_suggestions`
- Host accepts → creates/updates `seasonal_pricing`
- Host dismisses → status: `dismissed`

### Currency handling

- Prices stored in host's chosen currency (THB or USD)
- Exchange rates fetched daily, cached in Redis (TTL: 24h)
- Display-only conversion for guests
- Charge always in property's currency
- Show both at checkout: "฿20,700 (~$590 USD)"

---

## 10. Email Notifications

### Transactional emails via Resend + React Email

| Event | Recipient |
|---|---|
| Booking confirmed (instant) | Guest |
| Booking request received | Host |
| Booking approved | Guest |
| Booking rejected | Guest |
| Payment successful | Guest |
| Payment failed | Guest |
| Installment due | Guest |
| Installment overdue | Guest + Admin |
| Cancellation processed | Guest + Host |
| Payout sent | Host |
| Property approved | Host |
| Property rejected | Host |
| Host approval timeout (24h) | Host |
| Welcome email | Guest/Host |
| Become a host confirmed | Host |

### Bilingual support

- Detect recipient's `preferred_locale`
- Each template supports `th` and `en`
- Property names from `property_translations`

---

## 11. Caching & Performance

### Redis cache keys

| Key pattern | TTL | Invalidation |
|---|---|---|
| `search:{sha256(JSON.stringify(sortedParams))}` | 5 min | Auto-expire |
| `property:{slug}:{locale}` | 15 min | On update |
| `availability:{room_type_id}:{month}` | 10 min | On booking/sync |
| `pricing:{room_type_id}:{month}` | 30 min | On pricing update |
| `exchange_rate:{from}:{to}` | 24h | Daily cron |
| `autocomplete:{prefix}` | 1h | Auto-expire |

### Redis locks

| Key | Purpose | TTL |
|---|---|---|
| `checkout_lock:{room_type_id}:{checkIn}:{checkOut}` | Hold availability during checkout (single key per booking attempt, not per-date) | 15 min |
| `booking_approval:{booking_id}` | Prevent duplicate clicks | 30s |
| `payout_processing:{payout_id}` | Prevent duplicate payouts | 5 min |

### Next.js caching

- **ISR:** Homepage (10 min), amenity list (24h)
- **Dynamic + cache:** Property detail (stale-while-revalidate)
- **No cache:** Checkout, host dashboard, admin panel

### Image optimization

```
Cloudinary transforms:
  Thumbnail:  w_400, h_300, c_fill, f_auto, q_auto
  Detail:     w_800, h_600, c_fill, f_auto, q_auto
  Full:       w_1200, f_auto, q_80
  Blur hash:  w_20, h_15, e_blur:1000 (inline base64)
```

### Database performance

- Supabase PgBouncer for connection pooling
- Partial indexes on active properties
- EXPLAIN ANALYZE during development
- Drizzle relational queries to avoid N+1

### Client performance

- Route-based code splitting (automatic)
- Dynamic import: map component, date picker
- TanStack Query: prefetch on hover, infinite scroll
- `staleTime`: 5 min search, 1 min availability

---

## 12. Internationalization

### Setup: next-intl with App Router

- URL-based: `/th/*`, `/en/*`
- Detection: URL → Accept-Language header → Thai (default)
- Redirect `/` → `/th/`

### Translation files

```json
{
  "common": {},
  "property": {},
  "booking": {},
  "host": {},
  "admin": {},
  "email": {},
  "errors": {}
}
```

### Dynamic content

- Property names/descriptions → `property_translations`
- Amenity names → `amenity_translations`
- Room type names → `room_type_translations`
- Static UI → JSON files

### SEO

- `hreflang` tags linking Thai ↔ English
- Localized meta titles from translations
- Sitemap with both locale entries

---

## 13. Security Checklist

### Input validation
- Zod on every server action and API route
- Zod-validated environment variables
- Sanitize user-generated text
- File upload: max 10MB, JPEG/PNG/WebP only

### Authentication & session
- Short JWT expiry (1h) with refresh rotation
- Middleware refreshes session per request
- Re-auth before sensitive actions

### Authorization
- RLS on every table
- Server actions double-check ownership
- Admin routes: middleware + server action protection

### Payment security
- PCI DSS: card data never on our server
- Webhook signature verification
- Idempotency keys
- Server-side price recalculation
- Currency mismatch validation

### Bot protection
- Cloudflare Turnstile on: login, register, forgot password, checkout

### Data protection
- pgcrypto for sensitive fields (tax_id)
- HTTPS (Vercel)
- Secure, HttpOnly, SameSite cookies
- UUIDs (not sequential IDs)
- CORS restricted to own domain
- CSP headers in next.config.ts

### Infrastructure
- Env vars in Vercel dashboard, never in git
- `npm audit` in CI
- `.env.local` in `.gitignore`
- Database backups: Supabase automated daily backups with point-in-time recovery (Pro plan), verify backup restoration quarterly

### Audit
- All booking/payment/payout state changes logged
- All admin actions logged
- Immutable audit_log (no UPDATE/DELETE)

---

## 14. Third-Party Integrations

| Service | Purpose |
|---|---|
| Supabase | Postgres DB, Auth, Realtime |
| Opn Payments | Thai payments |
| Stripe | International payments |
| Channex | Channel manager sync |
| Cloudinary | Image storage + optimization |
| Upstash Redis | Caching + rate limiting |
| Resend | Transactional emails |
| Cloudflare Turnstile | Bot protection |
| Leaflet + OpenStreetMap | Map view |
| next-intl | i18n |
| Vercel | Hosting + CDN + cron |

---

## 15. Build Sequence (Sub-projects)

Each sub-project gets its own plan → implementation cycle:

1. **Core platform + Auth + DB schema** — Next.js setup, Supabase config, Drizzle schema, auth flow, middleware, i18n
2. **Host dashboard + Listing management** — Property CRUD, room types, photos (Cloudinary), amenities, calendar, base pricing + seasonal pricing
3. **Search + Discovery** — Filters, PostGIS queries, map view (Leaflet), autocomplete, caching, price calculation for display
4. **Booking + Availability** — Booking flow (instant + request), availability management, Redis locks
5. **Payments** — Opn + Stripe integration, abstraction layer, webhooks, refunds, payment schedules
6. **Channex integration** — Inventory sync, webhook handling, conflict resolution
7. **Admin panel** — Property approval, user management, booking oversight, finance
8. **Smart pricing engine** — Demand analysis, pricing suggestions (advisory), currency conversion
