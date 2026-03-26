# Sub-project 1: Core Platform + Auth + DB Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the Next.js 16 project foundation with Supabase Auth, Drizzle ORM schema for all 18 tables, i18n routing, proxy-based auth/rate limiting, and environment configuration.

**Architecture:** Monolithic Next.js 16 app with module boundaries. Supabase provides Postgres (with PostGIS) + Auth. Drizzle ORM handles type-safe queries and migrations. next-intl provides URL-based i18n. proxy.ts (Next.js 16's renamed middleware) handles auth session refresh, locale routing, and rate limiting.

**Tech Stack:** Next.js 16 + Turbopack, Tailwind CSS, Supabase (Postgres + Auth), Drizzle ORM, Zod, Upstash Redis, next-intl, @upstash/ratelimit, Cloudflare Turnstile

**Spec:** `docs/superpowers/specs/2026-03-26-hotel-booking-platform-design.md`

---

## File Map

### Project root
- `package.json` — dependencies
- `next.config.ts` — Next.js config (i18n, images, CSP headers)
- `proxy.ts` — Next.js 16 proxy (auth refresh + i18n routing + rate limiting)
- `drizzle.config.ts` — Drizzle migration config
- `tailwind.config.ts` — Tailwind config
- `.env.local` — local env vars (gitignored)
- `.env.example` — env var template (committed)
- `.gitignore` — ignore node_modules, .env.local, .next, etc.

### `src/config/`
- `env.server.ts` — Zod-validated server-only env vars
- `env.client.ts` — Zod-validated NEXT_PUBLIC_* env vars
- `constants.ts` — app-wide constants (cancellation policies, property types, etc.)

### `src/shared/types/`
- `index.ts` — shared TypeScript types and enums (Locale, Currency, Role, PropertyType, etc.)

### `src/shared/db/`
- `index.ts` — Drizzle client instantiation
- `schema/index.ts` — barrel export for all schemas
- `schema/user.ts` — users, user_roles, host_profiles tables
- `schema/property.ts` — properties, property_translations, property_photos, amenities, amenity_translations, property_amenities tables
- `schema/room-type.ts` — room_types, room_type_translations, room_type_photos tables
- `schema/pricing.ts` — room_type_pricing, seasonal_pricing, pricing_suggestions tables
- `schema/availability.ts` — availability table
- `schema/booking.ts` — bookings, payment_schedule tables
- `schema/payment.ts` — transactions, payouts tables
- `schema/audit.ts` — audit_log table
- `seed.ts` — seed data (amenities, admin user)

### `src/shared/lib/`
- `supabase/server.ts` — Supabase server client (reads cookies)
- `supabase/client.ts` — Supabase browser client
- `supabase/proxy.ts` — Supabase proxy client (token refresh)
- `redis.ts` — Upstash Redis client
- `logger.ts` — structured logger (pino)

### `src/shared/middleware/`
- `auth.ts` — role-based route protection helper
- `rate-limit.ts` — per-route rate limit config + helper

### `src/shared/validators/`
- `index.ts` — shared Zod schemas (date ranges, money, pagination, etc.)

### `src/shared/lib/i18n/`
- `routing.ts` — next-intl routing config
- `request.ts` — next-intl request config

### `messages/`
- `en.json` — English translations (skeleton)
- `th.json` — Thai translations (skeleton)

### `app/`
- `layout.tsx` — root layout
- `not-found.tsx` — global 404
- `error.tsx` — global error boundary
- `[locale]/layout.tsx` — locale layout (wraps next-intl provider)
- `[locale]/(auth)/layout.tsx` — minimal centered auth layout
- `[locale]/(auth)/login/page.tsx` — login page (placeholder)
- `[locale]/(auth)/register/page.tsx` — register page (placeholder)
- `[locale]/(auth)/callback/page.tsx` — OAuth callback handler
- `[locale]/(guest)/layout.tsx` — guest layout (navbar + footer placeholder)
- `[locale]/(guest)/page.tsx` — homepage (placeholder)
- `[locale]/(host)/layout.tsx` — host layout (sidebar placeholder, role-protected)
- `[locale]/(host)/dashboard/page.tsx` — host dashboard (placeholder)
- `[locale]/(admin)/layout.tsx` — admin layout (sidebar placeholder, role-protected)
- `[locale]/(admin)/dashboard/page.tsx` — admin dashboard (placeholder)

---

## Task 1: Initialize Next.js 16 project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `.gitignore`, `.env.example`, `.env.local`, `tsconfig.json`

- [ ] **Step 1: Scaffold Next.js 16 app**

Run:
```bash
pnpm create next-app@latest . --yes --typescript --tailwind --eslint --app --turbopack --import-alias "@/*"
```

Expected: Next.js project created in current directory with App Router, Tailwind, TypeScript, Turbopack.

- [ ] **Step 2: Verify dev server starts**

Run: `pnpm dev`
Expected: Dev server starts on localhost:3000 with Turbopack, default Next.js page loads.

- [ ] **Step 3: Clean up default files**

Remove default content from:
- `app/page.tsx` — replace with simple `<h1>Hotel Booking Platform</h1>`
- `app/globals.css` — keep only Tailwind directives
- Delete `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` (default assets)

- [ ] **Step 4: Create .env.example**

Create `.env.example`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Payments
OPN_SECRET_KEY=
OPN_PUBLIC_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
OPN_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Channex
CHANNEX_API_KEY=

# Vercel Cron
CRON_SECRET=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

- [ ] **Step 5: Add .env.local to .gitignore**

Verify `.gitignore` contains `.env*.local`. If not, add it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 16 project with Turbopack and Tailwind"
```

---

## Task 2: Install core dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase + Drizzle + ORM deps**

```bash
pnpm add @supabase/supabase-js @supabase/ssr drizzle-orm postgres zod
pnpm add -D drizzle-kit @types/node
```

- [ ] **Step 2: Install Redis + rate limiting**

```bash
pnpm add @upstash/redis @upstash/ratelimit
```

- [ ] **Step 3: Install i18n**

```bash
pnpm add next-intl
```

- [ ] **Step 4: Install logging**

```bash
pnpm add pino pino-pretty
pnpm add -D @types/pino
```

- [ ] **Step 5: Verify no dependency conflicts**

Run: `pnpm install`
Expected: No errors, no peer dependency conflicts.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: install core dependencies (Supabase, Drizzle, Redis, next-intl, Zod, pino)"
```

---

## Task 3: Environment variable validation with Zod

**Files:**
- Create: `src/config/env.server.ts`, `src/config/env.client.ts`

- [ ] **Step 1: Create server env validation**

Create `src/config/env.server.ts`:
```typescript
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  OPN_SECRET_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  OPN_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  CHANNEX_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  TURNSTILE_SECRET_KEY: z.string().min(1),
});

export const serverEnv = serverEnvSchema.parse(process.env);
```

- [ ] **Step 2: Create client env validation**

Create `src/config/env.client.ts`:
```typescript
import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
});
```

- [ ] **Step 3: Commit**

```bash
git add src/config/
git commit -m "feat: add Zod-validated environment variable config"
```

---

## Task 4: Shared types and constants

**Files:**
- Create: `src/shared/types/index.ts`, `src/config/constants.ts`

- [ ] **Step 1: Create shared types**

Create `src/shared/types/index.ts`:
```typescript
export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];

export const CURRENCIES = ["THB", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ROLES = ["guest", "host", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const PROPERTY_TYPES = ["hotel", "resort", "condo", "rental_house"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = ["draft", "pending_review", "active", "suspended", "archived"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const BOOKING_MODES = ["instant", "request"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

export const PAYMENT_POLICIES = ["full_upfront", "deposit", "monthly"] as const;
export type PaymentPolicy = (typeof PAYMENT_POLICIES)[number];

export const CANCELLATION_POLICIES = ["flexible", "moderate", "strict", "non_refundable"] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const BOOKING_STATUSES = [
  "pending_approval", "pending_payment", "confirmed",
  "checked_in", "completed", "cancelled", "rejected",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const TRANSACTION_TYPES = ["charge", "refund", "deposit", "installment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_PROVIDERS = ["opn", "stripe"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const USER_STATUSES = ["active", "suspended", "banned"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
```

- [ ] **Step 2: Create constants**

Create `src/config/constants.ts`:
```typescript
export const DEFAULT_LOCALE = "th" as const;
export const DEFAULT_CURRENCY = "THB" as const;
export const DEFAULT_COMMISSION_RATE = 0.15;
export const CHECKOUT_LOCK_TTL_SECONDS = 900; // 15 minutes
export const PAYOUT_HOLD_HOURS = 48;
export const HOST_APPROVAL_TIMEOUT_HOURS = 24;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types/ src/config/constants.ts
git commit -m "feat: add shared types, enums, and app constants"
```

---

## Task 5: Drizzle ORM schema — Users & Auth

**Files:**
- Create: `src/shared/db/schema/user.ts`, `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create users schema**

Create `src/shared/db/schema/user.ts`:
```typescript
import {
  pgTable, uuid, text, boolean, timestamp, primaryKey,
} from "drizzle-orm/pg-core";
import { USER_STATUSES, ROLES, LOCALES, CURRENCIES } from "@/shared/types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // from Supabase Auth
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  status: text("status", { enum: USER_STATUSES }).notNull().default("active"),
  preferredLocale: text("preferred_locale", { enum: LOCALES }).notNull().default("th"),
  preferredCurrency: text("preferred_currency", { enum: CURRENCIES }).notNull().default("THB"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ROLES }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.role] }),
]);

export const hostProfiles = pgTable("host_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  taxId: text("tax_id"), // encrypted via pgcrypto at app level
  opnConnectId: text("opn_connect_id"),
  stripeConnectId: text("stripe_connect_id"),
  commissionRate: text("commission_rate").notNull().default("0.15"), // stored as text, parsed as decimal
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Create schema barrel export**

Create `src/shared/db/schema/index.ts`:
```typescript
export * from "./user";
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/db/schema/
git commit -m "feat: add Drizzle schema for users, user_roles, host_profiles"
```

---

## Task 6: Drizzle ORM schema — Properties

**Files:**
- Create: `src/shared/db/schema/property.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create properties schema**

Create `src/shared/db/schema/property.ts`:
```typescript
import {
  pgTable, uuid, text, boolean, timestamp, integer, primaryKey,
} from "drizzle-orm/pg-core";
import { hostProfiles } from "./user";
import {
  PROPERTY_TYPES, PROPERTY_STATUSES, BOOKING_MODES,
  PAYMENT_POLICIES, CANCELLATION_POLICIES, LOCALES,
} from "@/shared/types";

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => hostProfiles.id, { onDelete: "cascade" }),
  slug: text("slug").unique().notNull(),
  type: text("type", { enum: PROPERTY_TYPES }).notNull(),
  status: text("status", { enum: PROPERTY_STATUSES }).notNull().default("draft"),
  bookingMode: text("booking_mode", { enum: BOOKING_MODES }).notNull().default("instant"),
  paymentPolicy: text("payment_policy", { enum: PAYMENT_POLICIES }).notNull().default("full_upfront"),
  cancellationPolicy: text("cancellation_policy", { enum: CANCELLATION_POLICIES }).notNull().default("moderate"),
  channexPropertyId: text("channex_property_id"),
  petFriendly: boolean("pet_friendly").notNull().default(false),
  // PostGIS location stored as text — we use raw SQL for geo queries
  // Actual column type: GEOGRAPHY(POINT, 4326) — created via migration SQL
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const propertyTranslations = pgTable("property_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  locale: text("locale", { enum: LOCALES }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
}, (table) => [
  // unique constraint handled via migration SQL
]);

export const propertyPhotos = pgTable("property_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  cloudinaryId: text("cloudinary_id").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  altText: text("alt_text"),
});

export const amenities = pgTable("amenities", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  icon: text("icon").notNull(),
});

export const amenityTranslations = pgTable("amenity_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  amenityId: uuid("amenity_id").notNull().references(() => amenities.id, { onDelete: "cascade" }),
  locale: text("locale", { enum: LOCALES }).notNull(),
  name: text("name").notNull(),
});

export const propertyAmenities = pgTable("property_amenities", {
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  amenityId: uuid("amenity_id").notNull().references(() => amenities.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.propertyId, table.amenityId] }),
]);
```

- [ ] **Step 2: Add to barrel export**

Add to `src/shared/db/schema/index.ts`:
```typescript
export * from "./property";
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/db/schema/
git commit -m "feat: add Drizzle schema for properties, translations, photos, amenities"
```

---

## Task 7: Drizzle ORM schema — Room Types, Pricing, Availability

**Files:**
- Create: `src/shared/db/schema/room-type.ts`, `src/shared/db/schema/pricing.ts`, `src/shared/db/schema/availability.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create room types schema**

Create `src/shared/db/schema/room-type.ts`:
```typescript
import {
  pgTable, uuid, text, integer, timestamp,
} from "drizzle-orm/pg-core";
import { properties } from "./property";
import { LOCALES } from "@/shared/types";

export const roomTypes = pgTable("room_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  totalUnits: integer("total_units").notNull().default(1),
  maxGuests: integer("max_guests").notNull(),
  bedrooms: integer("bedrooms").notNull().default(1),
  bathrooms: integer("bathrooms").notNull().default(1),
  minStayNights: integer("min_stay_nights").notNull().default(1),
  maxStayNights: integer("max_stay_nights"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomTypeTranslations = pgTable("room_type_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  locale: text("locale", { enum: LOCALES }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

export const roomTypePhotos = pgTable("room_type_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  cloudinaryId: text("cloudinary_id").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
```

- [ ] **Step 2: Create pricing schema**

Create `src/shared/db/schema/pricing.ts`:
```typescript
import {
  pgTable, uuid, text, numeric, date, timestamp,
} from "drizzle-orm/pg-core";
import { roomTypes } from "./room-type";
import { properties } from "./property";
import { CURRENCIES } from "@/shared/types";

export const roomTypePricing = pgTable("room_type_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").unique().notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  nightlyRate: numeric("nightly_rate", { precision: 12, scale: 2 }).notNull(),
  weeklyDiscount: numeric("weekly_discount", { precision: 4, scale: 2 }).notNull().default("0.00"),
  monthlyDiscount: numeric("monthly_discount", { precision: 4, scale: 2 }).notNull().default("0.00"),
  depositPercentage: numeric("deposit_percentage", { precision: 4, scale: 2 }).notNull().default("0.00"),
  currency: text("currency", { enum: CURRENCIES }).notNull().default("THB"),
});

export const seasonalPricing = pgTable("seasonal_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  nightlyRate: numeric("nightly_rate", { precision: 12, scale: 2 }).notNull(),
  // EXCLUDE constraint for overlapping dates added via custom migration SQL
});

export const pricingSuggestions = pgTable("pricing_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  suggestedRate: numeric("suggested_rate", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  dateRangeStart: date("date_range_start").notNull(),
  dateRangeEnd: date("date_range_end").notNull(),
  status: text("status", { enum: ["pending", "accepted", "dismissed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 3: Create availability schema**

Create `src/shared/db/schema/availability.ts`:
```typescript
import {
  pgTable, uuid, text, integer, date,
} from "drizzle-orm/pg-core";
import { roomTypes } from "./room-type";

export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  availableCount: integer("available_count").notNull().default(0),
  status: text("status", { enum: ["available", "blocked"] }).notNull().default("available"),
  source: text("source", { enum: ["platform", "channex"] }).notNull().default("platform"),
  // UNIQUE(room_type_id, date) added via migration SQL
});
```

- [ ] **Step 4: Update barrel export**

Update `src/shared/db/schema/index.ts`:
```typescript
export * from "./user";
export * from "./property";
export * from "./room-type";
export * from "./pricing";
export * from "./availability";
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/db/schema/
git commit -m "feat: add Drizzle schema for room types, pricing, availability"
```

---

## Task 8: Drizzle ORM schema — Bookings, Payments, Audit

**Files:**
- Create: `src/shared/db/schema/booking.ts`, `src/shared/db/schema/payment.ts`, `src/shared/db/schema/audit.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create bookings schema**

Create `src/shared/db/schema/booking.ts`:
```typescript
import {
  pgTable, uuid, text, integer, numeric, date, timestamp, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { properties } from "./property";
import { roomTypes } from "./room-type";
import { users } from "./user";
import { transactions } from "./payment";
import {
  BOOKING_STATUSES, BOOKING_MODES, CANCELLATION_POLICIES,
  PAYMENT_POLICIES, CURRENCIES,
} from "@/shared/types";

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "restrict" }),
  guestId: uuid("guest_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  guestsCount: integer("guests_count").notNull(),
  roomsCount: integer("rooms_count").notNull().default(1),
  status: text("status", { enum: BOOKING_STATUSES }).notNull().default("pending_approval"),
  bookingMode: text("booking_mode", { enum: BOOKING_MODES }).notNull(),
  cancellationPolicy: text("cancellation_policy", { enum: CANCELLATION_POLICIES }).notNull(),
  paymentPolicy: text("payment_policy", { enum: PAYMENT_POLICIES }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
  currency: text("currency", { enum: CURRENCIES }).notNull(),
  specialRequests: text("special_requests"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("check_out_after_check_in", sql`${table.checkOut} > ${table.checkIn}`),
]);

export const paymentSchedule = pgTable("payment_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["upcoming", "paid", "overdue", "failed"] }).notNull().default("upcoming"),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Create payments schema**

Create `src/shared/db/schema/payment.ts`:
```typescript
import {
  pgTable, uuid, text, numeric, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { bookings } from "./booking";
import { hostProfiles } from "./user";
import { PAYMENT_PROVIDERS, TRANSACTION_TYPES, CURRENCIES } from "@/shared/types";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  provider: text("provider", { enum: PAYMENT_PROVIDERS }).notNull(),
  providerTxId: text("provider_tx_id").notNull(),
  providerEventId: text("provider_event_id"),
  type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency", { enum: CURRENCIES }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "refunded"] }).notNull().default("pending"),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // UNIQUE(provider, provider_event_id) added via migration SQL
});

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => hostProfiles.id),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency", { enum: CURRENCIES }).notNull(),
  status: text("status", { enum: ["pending", "hold", "processing", "completed", "failed"] }).notNull().default("pending"),
  holdUntil: timestamp("hold_until", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Note: `bookings` and `transactions` have a circular reference (`bookings` is defined first, `payment_schedule` references `transactions`). Drizzle handles this via lazy references — but the files must be structured so that `payment.ts` imports `booking.ts`, not the other way around. `booking.ts` imports `transactions` from `payment.ts` for the `paymentSchedule.transactionId` FK. If Drizzle throws a circular import error, resolve by moving `paymentSchedule` into `payment.ts` instead.

- [ ] **Step 3: Create audit log schema**

Create `src/shared/db/schema/audit.ts`:
```typescript
import {
  pgTable, uuid, text, jsonb, timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./user";

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  performedBy: uuid("performed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Update barrel export**

Update `src/shared/db/schema/index.ts`:
```typescript
export * from "./user";
export * from "./property";
export * from "./room-type";
export * from "./pricing";
export * from "./availability";
export * from "./payment";
export * from "./booking";
export * from "./audit";
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/db/schema/
git commit -m "feat: add Drizzle schema for bookings, payments, payouts, audit log"
```

---

## Task 9: Drizzle client and migration config

**Files:**
- Create: `src/shared/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle client**

Create `src/shared/db/index.ts`:
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
```

Note: `prepare: false` is required for Supabase connection pooling (PgBouncer in transaction mode).

- [ ] **Step 2: Create Drizzle config**

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/db/schema",
  out: "./src/shared/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Add drizzle scripts to package.json**

Add to `package.json` scripts:
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/index.ts drizzle.config.ts package.json
git commit -m "feat: add Drizzle client and migration config"
```

---

## Task 10: Generate and apply migrations

**Files:**
- Create: `src/shared/db/migrations/` (auto-generated)

- [ ] **Step 1: Set up Supabase project**

If not done yet: create a Supabase project at https://supabase.com/dashboard. Copy the connection string (use connection pooling URL) into `.env.local` as `DATABASE_URL`. Also copy `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

- [ ] **Step 2: Enable required extensions in Supabase**

Go to Supabase Dashboard → Database → Extensions. Enable:
- `postgis` — geo-spatial queries
- `pg_trgm` — fuzzy text search
- `btree_gist` — EXCLUDE constraints
- `pgcrypto` — encryption (usually enabled by default)

Or run via SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

- [ ] **Step 3: Generate migrations**

Run: `pnpm db:generate`
Expected: Migration files created in `src/shared/db/migrations/`

- [ ] **Step 4: Review generated migration**

Open the generated SQL file. Verify it includes all 18 tables with correct column types. Note: PostGIS `GEOGRAPHY` column, `EXCLUDE` constraint, and `CHECK` constraints may need manual SQL additions.

- [ ] **Step 5: Add custom SQL migration for PostGIS, constraints, indexes, and triggers**

Create a custom migration file `src/shared/db/migrations/0001_custom_constraints.sql`:
```sql
-- PostGIS location column (replace lat/lng text columns)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);
-- Backfill: UPDATE properties SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326);

-- Unique constraints
ALTER TABLE property_translations ADD CONSTRAINT uq_property_locale UNIQUE (property_id, locale);
ALTER TABLE amenity_translations ADD CONSTRAINT uq_amenity_locale UNIQUE (amenity_id, locale);
ALTER TABLE room_type_translations ADD CONSTRAINT uq_room_type_locale UNIQUE (room_type_id, locale);
ALTER TABLE availability ADD CONSTRAINT uq_availability_room_date UNIQUE (room_type_id, date);
ALTER TABLE transactions ADD CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id);

-- Check constraints
ALTER TABLE availability ADD CONSTRAINT chk_available_count CHECK (available_count >= 0);

-- Seasonal pricing overlap prevention
ALTER TABLE seasonal_pricing ADD CONSTRAINT excl_seasonal_overlap
  EXCLUDE USING gist (
    room_type_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_property_translations_search_en ON property_translations
  USING GIN (to_tsvector('english', name || ' ' || description)) WHERE locale = 'en';
CREATE INDEX IF NOT EXISTS idx_property_translations_search_th ON property_translations
  USING GIN (to_tsvector('simple', name || ' ' || description)) WHERE locale = 'th';
CREATE INDEX IF NOT EXISTS idx_availability_room_date ON availability (room_type_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings (guest_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings (property_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties (type, pet_friendly) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions (booking_id);
CREATE INDEX IF NOT EXISTS idx_payouts_hold ON payouts (status, hold_until) WHERE status = 'hold';
CREATE INDEX IF NOT EXISTS idx_property_translations_trgm ON property_translations
  USING GIN ((city || ' ' || province) gin_trgm_ops);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_properties BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_bookings BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 6: Apply migrations**

Run: `pnpm db:push` (for development) or `pnpm db:migrate` (for production)
Expected: All tables created in Supabase. Verify via Supabase Dashboard → Table Editor.

- [ ] **Step 7: Commit**

```bash
git add src/shared/db/migrations/
git commit -m "feat: generate and apply database migrations with custom constraints and indexes"
```

---

## Task 11: Supabase client setup

**Files:**
- Create: `src/shared/lib/supabase/server.ts`, `src/shared/lib/supabase/client.ts`, `src/shared/lib/supabase/proxy.ts`

- [ ] **Step 1: Create browser client**

Create `src/shared/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Create server client**

Create `src/shared/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from Server Component — ignore
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Create proxy client**

Create `src/shared/lib/supabase/proxy.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — IMPORTANT: do not remove
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/lib/supabase/
git commit -m "feat: add Supabase client setup (browser, server, proxy)"
```

---

## Task 12: Redis and logger setup

**Files:**
- Create: `src/shared/lib/redis.ts`, `src/shared/lib/logger.ts`

- [ ] **Step 1: Create Redis client**

Create `src/shared/lib/redis.ts`:
```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

- [ ] **Step 2: Create logger**

Create `src/shared/lib/logger.ts`:
```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/redis.ts src/shared/lib/logger.ts
git commit -m "feat: add Upstash Redis client and pino logger"
```

---

## Task 13: i18n setup with next-intl

**Files:**
- Create: `src/shared/lib/i18n/routing.ts`, `src/shared/lib/i18n/request.ts`, `messages/en.json`, `messages/th.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Create routing config**

Create `src/shared/lib/i18n/routing.ts`:
```typescript
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "th"],
  defaultLocale: "th",
});
```

- [ ] **Step 2: Create request config**

Create `src/shared/lib/i18n/request.ts`:
```typescript
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { hasLocale } from "next-intl";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create translation files**

Create `messages/en.json`:
```json
{
  "common": {
    "appName": "StayHub",
    "search": "Search",
    "login": "Log in",
    "register": "Sign up",
    "logout": "Log out",
    "home": "Home",
    "loading": "Loading...",
    "error": "Something went wrong",
    "notFound": "Page not found"
  },
  "auth": {
    "loginTitle": "Log in to your account",
    "registerTitle": "Create an account",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "googleLogin": "Continue with Google",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?"
  },
  "host": {
    "dashboard": "Dashboard",
    "properties": "My Properties",
    "bookings": "Bookings",
    "payouts": "Payouts"
  },
  "admin": {
    "dashboard": "Admin Dashboard",
    "users": "Users",
    "properties": "Properties",
    "bookings": "All Bookings",
    "finance": "Finance"
  }
}
```

Create `messages/th.json`:
```json
{
  "common": {
    "appName": "StayHub",
    "search": "ค้นหา",
    "login": "เข้าสู่ระบบ",
    "register": "สมัครสมาชิก",
    "logout": "ออกจากระบบ",
    "home": "หน้าหลัก",
    "loading": "กำลังโหลด...",
    "error": "เกิดข้อผิดพลาด",
    "notFound": "ไม่พบหน้าที่ค้นหา"
  },
  "auth": {
    "loginTitle": "เข้าสู่ระบบ",
    "registerTitle": "สร้างบัญชีใหม่",
    "email": "อีเมล",
    "password": "รหัสผ่าน",
    "forgotPassword": "ลืมรหัสผ่าน?",
    "googleLogin": "เข้าสู่ระบบด้วย Google",
    "noAccount": "ยังไม่มีบัญชี?",
    "hasAccount": "มีบัญชีอยู่แล้ว?"
  },
  "host": {
    "dashboard": "แดชบอร์ด",
    "properties": "ที่พักของฉัน",
    "bookings": "การจอง",
    "payouts": "การจ่ายเงิน"
  },
  "admin": {
    "dashboard": "แดชบอร์ดผู้ดูแล",
    "users": "ผู้ใช้",
    "properties": "ที่พัก",
    "bookings": "การจองทั้งหมด",
    "finance": "การเงิน"
  }
}
```

- [ ] **Step 4: Update next.config.ts**

Add next-intl plugin to `next.config.ts`:
```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/lib/i18n/request.ts");

const nextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/i18n/ messages/ next.config.ts
git commit -m "feat: add next-intl i18n setup with Thai and English translations"
```

---

## Task 14: Rate limiting helper

**Files:**
- Create: `src/shared/middleware/rate-limit.ts`

- [ ] **Step 1: Create rate limit config**

Create `src/shared/middleware/rate-limit.ts`:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/shared/lib/redis";

type RateLimitConfig = {
  requests: number;
  window: `${number} s` | `${number} m` | `${number} h`;
};

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { requests: 5, window: "1 m" },
  forgotPassword: { requests: 3, window: "5 m" },
  search: { requests: 30, window: "1 m" },
  booking: { requests: 10, window: "1 m" },
  payment: { requests: 5, window: "1 m" },
  upload: { requests: 20, window: "5 m" },
  webhook: { requests: 100, window: "1 m" },
};

const rateLimiters = new Map<string, Ratelimit>();

function getRateLimiter(key: string): Ratelimit {
  if (!rateLimiters.has(key)) {
    const config = RATE_LIMITS[key] ?? { requests: 60, window: "1 m" };
    rateLimiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.requests, config.window),
        prefix: `ratelimit:${key}`,
      }),
    );
  }
  return rateLimiters.get(key)!;
}

export async function rateLimit(identifier: string, limitKey: string) {
  const limiter = getRateLimiter(limitKey);
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export function getRateLimitKey(pathname: string): string | null {
  if (pathname.includes("/login") || pathname.includes("/register")) return "auth";
  if (pathname.includes("/forgot-password")) return "forgotPassword";
  if (pathname.includes("/search")) return "search";
  if (pathname.includes("/api/webhooks")) return "webhook";
  return null; // no rate limit
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/middleware/
git commit -m "feat: add per-route rate limiting with Upstash"
```

---

## Task 15: Auth protection helper

**Files:**
- Create: `src/shared/middleware/auth.ts`

- [ ] **Step 1: Create auth helper**

Create `src/shared/middleware/auth.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/db";
import { userRoles } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import type { Role } from "@/shared/types";

// Route group → required role mapping
const PROTECTED_ROUTES: Record<string, Role> = {
  "(host)": "host",
  "(admin)": "admin",
};

export function getRequiredRole(pathname: string): Role | null {
  for (const [group, role] of Object.entries(PROTECTED_ROUTES)) {
    // Route groups are stripped from URL, so check for known host/admin paths
    if (group === "(host)" && pathname.match(/\/(en|th)\/(dashboard|properties|bookings|payouts)/)) {
      return role;
    }
    if (group === "(admin)" && pathname.match(/\/(en|th)\/admin/)) {
      return role;
    }
  }
  return null;
}

export function isAuthRoute(pathname: string): boolean {
  return /\/(en|th)\/(login|register|forgot-password|callback)/.test(pathname);
}

export function isAccountRoute(pathname: string): boolean {
  return /\/(en|th)\/account/.test(pathname);
}
```

Note: Full role checking (querying `user_roles` table) happens in server actions and page-level data fetching, not in the proxy. The proxy only handles session refresh and basic redirects based on auth state.

- [ ] **Step 2: Commit**

```bash
git add src/shared/middleware/auth.ts
git commit -m "feat: add auth route protection helpers"
```

---

## Task 16: proxy.ts — unified proxy

**Files:**
- Create: `proxy.ts` (project root or `src/` depending on project structure)

- [ ] **Step 1: Create proxy.ts**

Create `proxy.ts` at project root (or `src/proxy.ts` if using src directory):
```typescript
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/shared/lib/i18n/routing";
import { updateSession } from "@/shared/lib/supabase/proxy";
import { rateLimit, getRateLimitKey } from "@/shared/middleware/rate-limit";
import { isAuthRoute } from "@/shared/middleware/auth";
import { type NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate limiting (skip for static assets)
  const rateLimitKey = getRateLimitKey(pathname);
  if (rateLimitKey) {
    const ip = request.headers.get("x-forwarded-for") ?? request.ip ?? "anonymous";
    const result = await rateLimit(ip, rateLimitKey);
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
          },
        },
      );
    }
  }

  // 2. Supabase session refresh
  const supabaseResponse = await updateSession(request);

  // 3. i18n locale routing
  const intlResponse = intlMiddleware(request);

  // Merge cookies from Supabase session refresh into intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Verify proxy works**

Run: `pnpm dev`
Navigate to `http://localhost:3000` — should redirect to `/th` (default locale).
Navigate to `http://localhost:3000/en` — should show English.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: add unified proxy with i18n routing, auth session refresh, and rate limiting"
```

---

## Task 17: App layouts and route groups

**Files:**
- Create: all layout and placeholder page files listed in the File Map under `app/`

- [ ] **Step 1: Create root layout**

Update `app/layout.tsx`:
```typescript
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayHub — Find Your Perfect Stay",
  description: "Book hotels, resorts, condos, and rental houses in Thailand",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

- [ ] **Step 2: Create locale layout**

Create `app/[locale]/layout.tsx`:
```typescript
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/shared/lib/i18n/routing";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create auth layout**

Create `app/[locale]/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create auth placeholder pages**

Create `app/[locale]/(auth)/login/page.tsx`:
```typescript
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("auth");
  return <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>;
}
```

Create `app/[locale]/(auth)/register/page.tsx`:
```typescript
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("auth");
  return <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>;
}
```

Create `app/[locale]/(auth)/callback/page.tsx`:
```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        router.push("/");
      }
    });
  }, [router]);

  return <p>Completing login...</p>;
}
```

- [ ] **Step 5: Create guest layout and homepage**

Create `app/[locale]/(guest)/layout.tsx`:
```typescript
import { useTranslations } from "next-intl";
import { Link } from "@/shared/lib/i18n/routing";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("appName")}</h1>
        <nav className="flex gap-4">
          <a href="/en" className="text-sm">EN</a>
          <a href="/th" className="text-sm">TH</a>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-gray-50 px-6 py-4 text-center text-sm text-gray-500">
        &copy; 2026 {t("appName")}
      </footer>
    </div>
  );
}
```

Create `app/[locale]/(guest)/page.tsx`:
```typescript
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6">
      <h1 className="text-4xl font-bold mb-4">{t("appName")}</h1>
      <p className="text-lg text-gray-600 mb-8">{t("search")}</p>
      {/* Search bar will be added in Sub-project 3 */}
    </div>
  );
}
```

- [ ] **Step 6: Create host layout and placeholder**

Create `app/[locale]/(host)/layout.tsx`:
```typescript
import { useTranslations } from "next-intl";

export default function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("host");

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h2 className="text-lg font-bold mb-6">{t("dashboard")}</h2>
        <nav className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">{t("properties")}</span>
          <span className="text-sm text-gray-300">{t("bookings")}</span>
          <span className="text-sm text-gray-300">{t("payouts")}</span>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

Create `app/[locale]/(host)/dashboard/page.tsx`:
```typescript
import { useTranslations } from "next-intl";

export default function HostDashboardPage() {
  const t = useTranslations("host");
  return <h1 className="text-2xl font-bold">{t("dashboard")}</h1>;
}
```

- [ ] **Step 7: Create admin layout and placeholder**

Create `app/[locale]/(admin)/layout.tsx`:
```typescript
import { useTranslations } from "next-intl";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("admin");

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-red-900 text-white p-6">
        <h2 className="text-lg font-bold mb-6">{t("dashboard")}</h2>
        <nav className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">{t("users")}</span>
          <span className="text-sm text-gray-300">{t("properties")}</span>
          <span className="text-sm text-gray-300">{t("bookings")}</span>
          <span className="text-sm text-gray-300">{t("finance")}</span>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
```

Create `app/[locale]/(admin)/dashboard/page.tsx`:
```typescript
import { useTranslations } from "next-intl";

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  return <h1 className="text-2xl font-bold">{t("dashboard")}</h1>;
}
```

- [ ] **Step 8: Create error and not-found pages**

Create `app/error.tsx`:
```typescript
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
```

Create `app/not-found.tsx`:
```typescript
export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600">Page not found</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Verify all routes work**

Run: `pnpm dev`
- `http://localhost:3000` → redirects to `/th`
- `/th` → Thai homepage
- `/en` → English homepage
- `/th/login` → Thai login page
- `/en/login` → English login page
- `/th/dashboard` → Host dashboard placeholder
- `/nonexistent` → 404 page

- [ ] **Step 10: Commit**

```bash
git add app/
git commit -m "feat: add app layouts and placeholder pages for all route groups"
```

---

## Task 18: Shared Zod validators

**Files:**
- Create: `src/shared/validators/index.ts`

- [ ] **Step 1: Create shared validators**

Create `src/shared/validators/index.ts`:
```typescript
import { z } from "zod";
import {
  LOCALES, CURRENCIES, PROPERTY_TYPES, BOOKING_MODES,
  PAYMENT_POLICIES, CANCELLATION_POLICIES,
} from "@/shared/types";

// Date range — check-out must be after check-in
export const dateRangeSchema = z.object({
  checkIn: z.string().date(),
  checkOut: z.string().date(),
}).refine((data) => data.checkOut > data.checkIn, {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
});

// Money — positive, two decimal places
export const moneySchema = z.string().regex(
  /^\d+(\.\d{1,2})?$/,
  "Must be a valid amount with up to 2 decimal places",
).refine((val) => parseFloat(val) > 0, {
  message: "Amount must be positive",
});

// Pagination — cursor-based
export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// Locale
export const localeSchema = z.enum(LOCALES);

// Currency
export const currencySchema = z.enum(CURRENCIES);

// Property type
export const propertyTypeSchema = z.enum(PROPERTY_TYPES);

// UUID
export const uuidSchema = z.string().uuid();

// Guest count validation
export const guestCountSchema = z.object({
  guestsCount: z.number().int().min(1).max(100),
  roomsCount: z.number().int().min(1).max(50),
  maxGuestsPerRoom: z.number().int().min(1),
}).refine((data) => data.guestsCount <= data.roomsCount * data.maxGuestsPerRoom, {
  message: "Guest count exceeds room capacity",
  path: ["guestsCount"],
});
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/validators/
git commit -m "feat: add shared Zod validators for dates, money, pagination"
```

---

## Task 19: Seed data script

**Files:**
- Create: `src/shared/db/seed.ts`

- [ ] **Step 1: Create seed script**

Create `src/shared/db/seed.ts`:
```typescript
import { db } from "./index";
import { amenities, amenityTranslations } from "./schema";

const SEED_AMENITIES = [
  { slug: "wifi", icon: "wifi", en: "Wi-Fi", th: "ไวไฟ" },
  { slug: "pool", icon: "waves", en: "Swimming Pool", th: "สระว่ายน้ำ" },
  { slug: "parking", icon: "car", en: "Parking", th: "ที่จอดรถ" },
  { slug: "kitchen", icon: "utensils", en: "Kitchen", th: "ห้องครัว" },
  { slug: "air_conditioning", icon: "snowflake", en: "Air Conditioning", th: "แอร์" },
  { slug: "washing_machine", icon: "shirt", en: "Washing Machine", th: "เครื่องซักผ้า" },
  { slug: "gym", icon: "dumbbell", en: "Gym", th: "ฟิตเนส" },
  { slug: "breakfast", icon: "coffee", en: "Breakfast Included", th: "รวมอาหารเช้า" },
  { slug: "pet_friendly", icon: "paw-print", en: "Pet Friendly", th: "สัตว์เลี้ยงเข้าได้" },
  { slug: "elevator", icon: "arrow-up-down", en: "Elevator", th: "ลิฟต์" },
  { slug: "balcony", icon: "sun", en: "Balcony", th: "ระเบียง" },
  { slug: "tv", icon: "tv", en: "TV", th: "โทรทัศน์" },
];

async function seed() {
  console.log("Seeding amenities...");

  for (const item of SEED_AMENITIES) {
    const [amenity] = await db
      .insert(amenities)
      .values({ slug: item.slug, icon: item.icon })
      .onConflictDoNothing()
      .returning();

    if (amenity) {
      await db.insert(amenityTranslations).values([
        { amenityId: amenity.id, locale: "en", name: item.en },
        { amenityId: amenity.id, locale: "th", name: item.th },
      ]).onConflictDoNothing();
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add seed script to package.json**

Add to `package.json` scripts:
```json
{
  "db:seed": "npx tsx src/shared/db/seed.ts"
}
```

- [ ] **Step 3: Run seed** (only after migrations are applied)

Run: `pnpm db:seed`
Expected: "Seeding amenities... Seed complete!"

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/seed.ts package.json
git commit -m "feat: add database seed script with amenities data"
```

---

## Task 20: Final verification

- [ ] **Step 1: Verify dev server runs without errors**

Run: `pnpm dev`
Expected: No TypeScript errors, no runtime errors. All pages render.

- [ ] **Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Build completes without errors. Note: this may fail if env vars are not set — that's expected and acceptable for now.

- [ ] **Step 3: Verify database connection**

Open Drizzle Studio: `pnpm db:studio`
Expected: Can browse all 18 tables, see seed data in amenities table.

- [ ] **Step 4: Final commit with any remaining fixes**

```bash
git add -A
git commit -m "chore: final fixes for sub-project 1 foundation"
```

---

## Summary

After completing all 20 tasks, the project has:
- Next.js 16 + Turbopack scaffolded with Tailwind CSS
- All 18 Drizzle ORM table schemas with migrations
- PostGIS, pg_trgm, btree_gist extensions enabled
- Custom indexes, constraints, and triggers applied
- Supabase Auth client setup (browser, server, proxy)
- Upstash Redis client with per-route rate limiting
- next-intl i18n with Thai (default) + English
- Unified proxy.ts handling auth, i18n, and rate limiting
- All route groups with placeholder layouts and pages
- Zod-validated environment variables and shared validators
- Structured logging with pino
- Seed data for amenities

**Next sub-project:** Sub-project 2 — Host Dashboard + Listing Management
