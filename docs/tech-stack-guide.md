# Tech Stack & Design Decisions Guide

A plain-language guide explaining every technology choice and architectural decision for this hotel booking platform. Written for team members, collaborators, and new developers joining the project.

---

## What We're Building

A property booking marketplace (similar to Traveloka/Airbnb) for Thailand. Guests search and book hotels, resorts, condos, and rental houses for short stays (days) or long stays (months). The platform supports Thai and international travelers, with payments in Thai Baht and USD.

---

## Tech Stack Overview

### Next.js 16 + Turbopack — Framework

**What it is:** A React-based framework for building full-stack web applications. It handles both the frontend (what users see) and backend (API routes, server logic) in a single codebase.

**Why we chose it:**
- **Server-side rendering (SSR):** Property pages load fast because the HTML is generated on the server before sending to the browser. This is critical for SEO — Google needs to index thousands of property listings.
- **Server actions:** We can write backend logic (like "create booking") directly alongside our frontend code, reducing boilerplate.
- **Turbopack:** The new Rust-based bundler (replaces Webpack). It makes development 5-10x faster — when you change code, the browser updates almost instantly. Production builds are also 2-5x faster.
- **App Router:** The latest routing system supports nested layouts, loading states, and error boundaries — perfect for a complex app with guest, host, and admin sections.

**Alternatives considered:**
- Remix — good framework but smaller ecosystem
- SvelteKit — great performance but fewer developers available for hiring
- Separate frontend + backend — more complex deployment and more code to maintain

---

### Tailwind CSS — Styling

**What it is:** A utility-first CSS framework. Instead of writing custom CSS classes, you compose styles directly in your HTML using utility classes like `bg-blue-500 text-white p-4`.

**Why we chose it:**
- Fast to build responsive UIs — mobile-first by default
- No naming conflicts or CSS bloat
- Works perfectly with component-based React development
- Industry standard — most developers know it

---

### TanStack Query (React Query) — Client-Side Data Management

**What it is:** A library for fetching, caching, and synchronizing server data on the client side.

**Why we chose it:**
- **Automatic caching:** When a guest searches for properties, the results are cached. Going back to the search page doesn't re-fetch data.
- **Optimistic updates:** When a host approves a booking, the UI updates instantly before the server confirms — feels snappy.
- **Real-time polling:** During checkout, we poll availability every few seconds to make sure the room hasn't been taken.
- **Prefetching:** When a guest hovers over a property card, we start loading the detail page data in the background.

**Why not just use Next.js server components?** Server components handle initial page loads well, but for interactive flows (search with filters, checkout, host dashboard actions), TanStack Query gives us much better control over caching and mutations.

---

### Supabase — Database, Auth, Storage, Realtime

**What it is:** An open-source Firebase alternative built on top of PostgreSQL. It bundles a database, authentication, file storage, and real-time subscriptions into one platform.

**Why we chose it:**
- **PostgreSQL:** A mature, reliable relational database. Unlike NoSQL options (MongoDB, Firebase), PostgreSQL handles complex queries (joining properties with room types, availability, pricing) efficiently.
- **PostGIS extension:** Built-in geo-spatial support. We can query "find all properties within 5km of this point" or "find all properties inside this map viewport" directly in SQL. Essential for our map-based search.
- **Row Level Security (RLS):** Database-level access control. Even if our application code has a bug, a host can never see another host's financial data because the database itself enforces the rules.
- **Supabase Auth:** Handles user signup/login, Google OAuth, password resets, and session management. No need to build auth from scratch.
- **Supabase Storage:** For storing property photos (backup — primary storage is Cloudinary).
- **Supabase Realtime:** For future features like live messaging between guests and hosts.

**Why not Firebase/MongoDB?** Our data is highly relational (properties have room types, room types have pricing, bookings link guests to room types, transactions link to bookings). This is exactly what relational databases excel at. Document databases would require denormalization and make queries much more complex.

**Why not a separate database + auth + storage?** Using Supabase bundles everything together, reducing the number of services to manage, and the integration between components (e.g., RLS using auth tokens) is seamless.

---

### Drizzle ORM — Database Queries

**What it is:** A TypeScript ORM (Object-Relational Mapper) that lets you write type-safe database queries in TypeScript instead of raw SQL.

**Why we chose it:**
- **Type safety:** If you try to query a column that doesn't exist, TypeScript catches it at compile time — not at runtime in production.
- **Migrations:** Schema changes are tracked in migration files, so database updates are reproducible and reversible.
- **Lightweight:** Unlike Prisma (the main alternative), Drizzle doesn't generate a heavy client. It produces SQL that's very close to what you'd write by hand.
- **Full SQL control:** For complex queries (PostGIS geo queries, window functions), Drizzle lets you drop down to raw SQL when needed.

**Why not Prisma?** Prisma is excellent but heavier. It generates its own query engine binary and has limitations with complex PostgreSQL features like PostGIS and EXCLUDE constraints. Drizzle is leaner and gives us more control.

---

### Zod — Input Validation

**What it is:** A TypeScript library for validating data at runtime.

**Why it's critical:**
- TypeScript types only exist at compile time — they disappear when code runs. A user can send literally anything to our API.
- Zod checks that incoming data has the correct shape, type, and constraints **when the code actually runs**.
- Example: Before creating a booking, Zod verifies that check-out is after check-in, guest count is positive, and the property ID is a valid UUID.
- Prevents security vulnerabilities like SQL injection and malformed payment amounts.

**Why non-negotiable for this project:** We handle real money. A negative payment amount, a malformed date, or a missing property ID reaching our payment logic could cause financial errors.

---

### Upstash Redis — Caching & Rate Limiting

**What it is:** A serverless Redis database. Redis is an in-memory data store — extremely fast for temporary data.

**Why we chose it:**
- **Search caching:** Identical search queries return cached results (TTL: 5 minutes) instead of hitting the database every time.
- **Rate limiting:** Prevents abuse — login attempts are limited to 5/minute, search to 30/minute, etc.
- **Checkout locks:** When a guest starts checkout, we place a temporary lock on those rooms to prevent double-booking during the payment process.
- **Serverless:** Upstash scales automatically and charges per-request. No server to manage.

**Why not Supabase's built-in caching?** Supabase doesn't have a Redis-like cache. Redis is purpose-built for this — sub-millisecond reads, TTL-based expiration, atomic operations for locks.

---

### Cloudinary — Image Management

**What it is:** A cloud-based image storage and optimization service.

**Why we chose it over simple file storage:**
- **Auto-format:** Serves WebP to Chrome, AVIF to Safari — smaller files, faster loads.
- **On-the-fly resizing:** One uploaded photo becomes: thumbnail (400x300), detail view (800x600), full size (1200px). No need to generate these ourselves.
- **Smart cropping:** Automatically detects the subject in a photo and crops intelligently for thumbnails.
- **Built-in CDN:** Photos load fast regardless of where the guest is located.
- **Performance matters:** Property photos are the heaviest assets on a booking site. Unoptimized images = slow page loads = lost bookings.

**Why not Supabase Storage?** Supabase Storage is just S3-compatible file storage. We'd need to build our own image processing pipeline (resizing, format conversion, CDN). Cloudinary handles all of this automatically.

---

### Opn Payments — Thai Payment Methods

**What it is:** A Thai-founded payment gateway (formerly Omise). It processes payments through local Thai methods.

**Why we chose it:**
- **PromptPay support:** PromptPay (QR-code bank transfers) is how most Thai people pay online. No Thai payment platform is complete without it.
- **TrueMoney Wallet:** Popular mobile wallet in Thailand.
- **Thai bank installments:** Allows guests to pay in monthly installments via Thai bank credit cards.
- **Thai credit/debit cards:** Lower processing fees than Stripe for domestic Thai cards.
- **Clean API:** Developer-friendly, similar to Stripe's API design.

---

### Stripe — International Payments

**What it is:** The world's most popular payment processor for online businesses.

**Why we use it alongside Opn:**
- **International cards:** Visa, Mastercard, Amex from any country.
- **Stripe Connect:** Handles payouts to hosts — Stripe stores their bank details securely so we don't have to.
- **Excellent fraud detection:** Machine learning-based fraud prevention.

**Why two providers?** Thai guests need PromptPay (Opn). International guests need standard card processing (Stripe). Neither provider covers both use cases well enough alone.

---

### Resend — Transactional Emails

**What it is:** An email sending service built for developers.

**Why we chose it:**
- **React Email:** We write email templates using React components — same language as our frontend. No separate templating language to learn.
- **Excellent deliverability:** Emails actually reach the inbox, not spam.
- **Free tier:** 100 emails/day is enough for launch.
- We send ~15 types of transactional emails: booking confirmations, payment receipts, payout notifications, etc.

---

### Cloudflare Turnstile — Bot Protection

**What it is:** A CAPTCHA alternative that verifies humans without annoying puzzles.

**Why we chose it:**
- **Invisible:** Most users never see a challenge — it runs in the background.
- **Free:** Unlike reCAPTCHA, Turnstile is completely free.
- **Where we use it:** Login, register, forgot password, and checkout forms — the pages most targeted by bots and brute-force attacks.

---

### Leaflet + OpenStreetMap — Maps

**What it is:** Leaflet is an open-source JavaScript mapping library. OpenStreetMap provides the map tiles (the actual map images).

**Why we chose it:**
- **Completely free:** No API key costs, no per-load charges.
- **Lightweight:** Leaflet is much smaller than Google Maps SDK.
- **Good enough:** For showing property pins on a map with price labels, Leaflet does everything we need.
- **Swappable:** If we outgrow it, we can switch to MapLibre (Mapbox alternative) or Mapbox itself without changing much code.

**Why not Google Maps?** Google Maps charges $7 per 1,000 map loads after the free tier. At scale, this adds up fast. For a startup, free is better.

---

### next-intl — Internationalization

**What it is:** A library for making Next.js apps multilingual.

**Why we chose it:**
- **URL-based routing:** `/th/property/beach-villa` for Thai, `/en/property/beach-villa` for English. This is better for SEO than cookie-based language switching because Google can index both versions.
- **App Router native:** Built specifically for Next.js App Router.
- **Type-safe:** Translation keys are type-checked — if you reference a key that doesn't exist, you get a compile error.

---

### Vercel — Hosting & Deployment

**What it is:** The company that created Next.js. Their hosting platform is optimized for Next.js applications.

**Why we chose it:**
- **Zero-config deployment:** Push to git → automatically deployed.
- **Edge CDN:** Static assets served from the closest data center to the user.
- **Serverless functions:** API routes and server actions scale automatically based on traffic.
- **Cron jobs:** Built-in support for scheduled tasks (payout processing, pricing suggestions).
- **Preview deployments:** Every pull request gets its own URL for testing.

---

## Architectural Decisions

### Why a monolithic app with module boundaries?

We chose a single Next.js application with clear internal module boundaries instead of a microservices architecture or a monorepo with multiple apps.

**The reasoning:**
- **Team size:** 1-3 developers. Microservices require dedicated DevOps and significantly more infrastructure management.
- **Speed to market:** One codebase = one deployment pipeline = faster development.
- **Cost:** One Vercel project instead of multiple. Estimated $50-200/month instead of $1,500+/month for Kubernetes.
- **Module boundaries:** Code is organized into self-contained modules (property, booking, payment, search, etc.) with public APIs. This means we can extract any module into its own service later if needed — the migration is mechanical, not architectural.

### Why separate payment and payout modules?

Charging guests and paying hosts are fundamentally different operations:
- Different providers may be involved (guest pays via Opn, host receives via Stripe Connect)
- Different timing (payment is immediate, payout has a 48-hour hold)
- Different failure modes and retry strategies
- Commission calculation is a payout concern, not a payment concern

### Why room_types instead of flat properties?

A hotel might have 50 rooms across 3 room types (Standard, Deluxe, Suite). Without a `room_types` table, a hotel would need 3 separate property listings — or 50 separate listings per room. The `room_types` model handles both:
- Hotels: 1 property → N room types → M units per type
- Condos/houses: 1 property → 1 room type → 1 unit

### Why decrement availability at booking creation, not after payment?

Thai payment methods (PromptPay, bank transfers) can take minutes to hours to confirm. If we wait for payment confirmation to reserve the room, the 15-minute Redis lock would expire, and another guest could start checkout for the same room. By decrementing availability immediately and restoring it if payment fails, the database constraint (`available_count >= 0`) becomes the authoritative guard against overbooking.

### Why URL-based i18n instead of cookie-based?

SEO. Google indexes `/th/property/beach-villa` and `/en/property/beach-villa` as separate pages with appropriate hreflang tags. This means Thai users searching in Thai find the Thai version, and English-speaking tourists find the English version. Cookie-based language switching only shows one URL to Google.

### Why Supabase Auth instead of Clerk?

We considered Clerk (more polished auth UI, better fraud detection) but chose Supabase Auth because:
- Native Row Level Security integration — `auth.uid()` works directly in RLS policies
- No user sync needed between auth and database
- Free with Supabase, no per-user pricing
- If we need Clerk's features later, it's a drop-in replacement that supports user import

The trade-off: we need to implement rate limiting (Upstash) and bot protection (Turnstile) ourselves, which Clerk includes built-in.

---

## Security Architecture

### Defense in depth

We don't rely on a single security layer. Every request passes through multiple checks:

1. **Middleware:** Is the user authenticated? Do they have the right role for this route?
2. **Rate limiting:** Has this IP exceeded the request limit?
3. **Bot protection:** Is this a human? (on sensitive forms)
4. **Zod validation:** Is the input data valid and safe?
5. **Server action checks:** Does this user own this resource?
6. **Row Level Security:** Even if all above fail, the database refuses unauthorized data access.

### Payment security (PCI compliance)

Credit card numbers **never touch our server.** Opn and Stripe handle card tokenization on their side. Our server only receives a token that represents the card — it cannot be used to extract the card number. This means we don't need PCI DSS certification, which would cost tens of thousands of dollars.

### Audit trail

Every financial event (booking status change, payment, refund, payout) is logged to an immutable `audit_log` table. These records can never be modified or deleted. This is essential for dispute resolution and regulatory compliance.

---

## Performance Strategy

### Why performance matters for a booking platform

- Slow search = guests leave and book elsewhere
- Slow checkout = abandoned bookings (and potentially double-booked rooms)
- Slow image loading = properties look bad, guests don't trust the platform

### How we optimize

1. **Redis caching:** Repeated search queries return cached results in <1ms instead of hitting the database (200-500ms).
2. **Image optimization:** Cloudinary serves the right image size in the right format. A property card loads a 400x300 thumbnail, not a 4000x3000 original.
3. **Server-side rendering:** Property pages are rendered on the server and sent as HTML — the browser shows content immediately while JavaScript loads in the background.
4. **Database indexes:** PostGIS spatial indexes make geo queries fast. Partial indexes only index active properties, keeping the index small.
5. **Code splitting:** Only the JavaScript needed for the current page is loaded. The map library is only loaded on the search page, not on checkout.
6. **Connection pooling:** Supabase's PgBouncer reuses database connections instead of opening a new one for every request.
