# StayHub

A property booking marketplace for Thailand. Guests search and book hotels, resorts, condos, and rental houses for short or long stays. The platform serves both Thai and international travelers with bilingual support (Thai + English) and dual payment processing.

## What it is

A two-sided marketplace similar to Traveloka/Airbnb:

- **Guests** search, browse, and book properties with flexible payment options (PromptPay, Thai bank cards, international cards)
- **Hosts** self-list properties and manage bookings via a dashboard
- **Admins** approve listings, manage users, and oversee revenue

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + Turbopack |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres + PostGIS) |
| ORM | Drizzle ORM |
| Auth | Supabase Auth |
| Caching / Rate limiting | Upstash Redis |
| Image storage | Supabase Storage |
| Payments (Thai) | Opn Payments — PromptPay, TrueMoney, Thai cards |
| Payments (International) | Stripe |
| Email | Resend + React Email |
| Maps | Leaflet + OpenStreetMap |
| i18n | next-intl (URL-based: `/th/`, `/en/`) |
| Bot protection | Cloudflare Turnstile |
| Deployment | Vercel |

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [Upstash](https://upstash.com) Redis database

Payment, email, and other service credentials are optional for local development.

## Getting Started

**1. Clone and install dependencies**

```bash
git clone <repo-url>
cd startupProject
npm install
```

**2. Set up environment variables**

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase and Upstash credentials at minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**3. Enable Supabase extensions**

In your Supabase dashboard, go to **Database → Extensions** and enable:

- `postgis` — geo-spatial queries for map search
- `pg_trgm` — fuzzy text search
- `btree_gist` — seasonal pricing overlap prevention
- `pgcrypto` — encryption (usually enabled by default)

Or run this in the Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**4. Run database migrations**

```bash
npm run db:generate   # generate migration files from schema
npm run db:push       # apply schema to your Supabase database
```

Then apply the custom SQL constraints (PostGIS column, indexes, triggers) by copying `src/shared/db/migrations/0001_custom_constraints.sql` and running it in the Supabase SQL editor.

**5. Seed the database**

```bash
npm run db:seed
```

This inserts the default amenities (Wi-Fi, pool, parking, kitchen, etc.) with Thai and English translations.

**6. Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to [http://localhost:3000/th](http://localhost:3000/th) (Thai is the default locale).

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migration files from schema |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:migrate` | Run migrations (production) |
| `npm run db:studio` | Open Drizzle Studio to browse the database |
| `npm run db:seed` | Seed amenities data |

## Project Structure

```
src/
├── config/
│   ├── constants.ts          # App-wide constants
│   ├── env.server.ts         # Zod-validated server env vars
│   └── env.client.ts         # Zod-validated public env vars
├── shared/
│   ├── db/
│   │   ├── index.ts          # Drizzle client
│   │   ├── schema/           # All 25 table definitions
│   │   ├── migrations/       # SQL migrations
│   │   └── seed.ts           # Seed script
│   ├── lib/
│   │   ├── supabase/         # Browser, server, and proxy clients
│   │   ├── i18n/             # next-intl routing and request config
│   │   ├── redis.ts          # Upstash Redis client
│   │   └── logger.ts         # Pino structured logger
│   ├── middleware/
│   │   ├── auth.ts           # Route protection helpers
│   │   └── rate-limit.ts     # Per-route rate limiting
│   ├── types/
│   │   └── index.ts          # Shared TypeScript types and enums
│   └── validators/
│       └── index.ts          # Shared Zod schemas
app/
├── [locale]/
│   ├── (auth)/               # Login, register, OAuth callback
│   ├── (guest)/              # Homepage, property search, booking
│   ├── (host)/               # Host dashboard (role-protected)
│   └── (admin)/              # Admin panel (role-protected)
messages/
├── en.json                   # English translations
└── th.json                   # Thai translations
proxy.ts                      # Unified middleware: auth + i18n + rate limiting
```

## Database Schema

25 tables across these domains:

| Domain | Tables |
|---|---|
| Auth | `users`, `user_roles`, `host_profiles` |
| Properties | `properties`, `property_translations`, `property_photos`, `amenities`, `amenity_translations`, `property_amenities` |
| Room types | `room_types`, `room_type_translations`, `room_type_photos` |
| Pricing | `room_type_pricing`, `seasonal_pricing`, `pricing_suggestions` |
| Availability | `availability` |
| Bookings | `bookings`, `payment_schedule` |
| Payments | `transactions`, `payouts` |
| Promotions | `promotions` |
| Reviews | `reviews` |
| Messaging | `conversations`, `messages` |
| Audit | `audit_log` |

## Routes

| URL | Description |
|---|---|
| `/th` or `/en` | Homepage |
| `/[locale]/login` | Login |
| `/[locale]/register` | Register |
| `/[locale]/callback` | OAuth callback |
| `/[locale]/dashboard` | Host dashboard |
| `/[locale]/admin/dashboard` | Admin panel |

## Environment Variables

See `.env.example` for the full list. Required for local development:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
| `DATABASE_URL` | Supabase dashboard → Settings → Database → Connection string (use the pooler URL) |
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard → your Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard → your Redis database |
