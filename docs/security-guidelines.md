# Security Guidelines

Threat model, security controls, and implementation rules for this platform. Covers all layers — middleware, server actions, database, payments, and infrastructure.

Last updated: March 2026.

---

## Threat Model

This is a two-sided financial marketplace. The primary attack surfaces are:

| Threat                                                        | Impact                                        | Attacker           |
| ------------------------------------------------------------- | --------------------------------------------- | ------------------ |
| Account takeover (brute force, credential stuffing)           | Guest/host account theft                      | External           |
| Privilege escalation (guest acting as host/admin)             | Unauthorized data access, fraudulent listings | Authenticated user |
| Payment manipulation (negative amounts, tampered booking IDs) | Financial loss                                | Authenticated user |
| SQL/NoSQL injection                                           | Full database read/write                      | External           |
| XSS via property descriptions / review text                   | Session hijack, phishing                      | Host/guest         |
| Webhook spoofing (fake Stripe/Opn events)                     | Free bookings, fraudulent payouts             | External           |
| Double-booking race condition                                 | Overbooking, financial disputes               | Concurrent users   |
| Insecure direct object reference (IDOR)                       | Viewing/modifying other users' data           | Authenticated user |
| Secrets exposure in logs/errors                               | Credential theft                              | Internal/external  |
| Bot abuse (scraping, fake accounts, checkout flooding)        | Platform degradation                          | Automated          |

---

## Layer 1 — Middleware (proxy.ts)

### ✅ Already in place

- Sliding window rate limiting via Upstash Redis on auth, search, and webhook routes
- Supabase session refresh on every request
- i18n locale routing

### ❌ Missing: Security headers

`next.config.ts` is empty — no HTTP security headers are set. This is the highest-priority gap.

Add to `next.config.ts`:

```ts
const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer policy — don't leak full URLs to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS — force HTTPS for 1 year (enable after confirming HTTPS is stable)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Permissions policy — disable unused browser APIs
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com", // Turnstile
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.omise.co https://js.stripe.com",
      "frame-src https://challenges.cloudflare.com https://js.stripe.com", // Turnstile + Stripe
      "font-src 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

### ❌ Missing: Role enforcement in proxy

`auth.ts` exports `getRequiredRole()` but `proxy.ts` never calls it. Protected routes are not actually blocked for unauthenticated/unauthorized users at the middleware layer.

Add role enforcement to `proxy.ts` after the session refresh:

```ts
// After updateSession(request):
const {
  data: { user },
} = await supabase.auth.getUser();
const requiredRole = getRequiredRole(pathname);

if (requiredRole) {
  if (!user) {
    // Not logged in — redirect to login
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = user.user_metadata?.role as Role | undefined;
  if (userRole !== requiredRole) {
    // Wrong role — redirect to home, not a 403 (don't reveal route existence)
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }
}
```

### ❌ Missing: Rate limiting on booking and payment routes

`getRateLimitKey` has no case for `/booking` or `/checkout`. Configs exist in `RATE_LIMITS` but are never wired up:

```ts
// Add to getRateLimitKey() in rate-limit.ts
if (pathname.includes("/checkout") || pathname.includes("/booking")) return "booking";
if (pathname.includes("/api/payment")) return "payment";
```

### IP extraction hardening

The current implementation trusts `x-forwarded-for` directly, which can be spoofed:

```ts
// Current — spoofable
const ip = request.headers.get("x-forwarded-for") ?? "anonymous";

// Better — on Vercel, use the verified header
const ip =
  request.headers.get("x-vercel-forwarded-for") ??
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
  "anonymous";
```

---

## Layer 2 — Server Actions

All mutations go through Next.js Server Actions (`"use server"`). Every action must follow this pattern:

### Required checks in every server action

```ts
"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { z } from "zod";
import { logger } from "@/shared/lib/logger";

const CreateBookingSchema = z.object({
  propertyId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guestsCount: z.number().int().min(1).max(100),
});

export async function createBooking(raw: unknown) {
  // 1. Authenticate — reject unauthenticated calls immediately
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Validate input — never trust raw data
  const input = CreateBookingSchema.parse(raw); // throws ZodError on invalid input

  // 3. Authorize — verify the user owns what they're acting on
  // (e.g. check the property exists and is active before booking)

  // 4. Business logic ...

  // 5. Log sensitive operations
  logger.info({ userId: user.id, action: "booking.create", propertyId: input.propertyId });
}
```

### Rules

- **Always call `supabase.auth.getUser()` — never trust cookies or tokens directly.** Supabase validates the JWT server-side on every call.
- **Never use `getSession()`** for authorization decisions — it reads from the cookie without re-validating the JWT signature. Use `getUser()` instead.
- **Validate with Zod before using any input.** Use `.parse()` (throws) not `.safeParse()` in actions — let the error boundary handle it.
- **Return generic errors to the client.** Log the specific error server-side:

```ts
// Bad — leaks internal detail
throw new Error(`Database error: column "foo" does not exist`);

// Good
logger.error({ err, userId: user.id, action: "createBooking" });
throw new Error("Something went wrong. Please try again.");
```

---

## Layer 3 — Database (Drizzle ORM + RLS)

### SQL injection prevention

Drizzle ORM uses parameterized queries by default — **never interpolate user input into SQL strings.**

```ts
// ❌ Never do this
const results = await db.execute(sql`SELECT * FROM properties WHERE city = '${userInput}'`);

// ✅ Always use Drizzle's query builder or parameterized sql tag
const results = await db.execute(
  sql`SELECT * FROM properties WHERE city = ${userInput}` // Drizzle escapes this
);

// ✅ Best — use the query builder
const results = await db.select().from(properties).where(eq(properties.city, userInput));
```

**PostGIS raw SQL** (geo queries) must also use parameterized values:

```ts
// ✅ PostGIS with parameters
const results = await db.execute(
  sql`
    SELECT id, slug
    FROM properties
    WHERE ST_DWithin(
      location::geography,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${radiusMeters}
    )
  `
);
```

### Row Level Security (RLS)

Supabase RLS is the last line of defence — even if application code has a bug, the database enforces access rules.

**Required RLS policies (implement before launch):**

```sql
-- Guests can only read their own bookings
CREATE POLICY "guests_own_bookings" ON bookings
  FOR SELECT USING (auth.uid() = guest_id);

-- Hosts can only read bookings for their properties
CREATE POLICY "hosts_property_bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties p
      JOIN host_profiles hp ON hp.id = p.host_id
      WHERE p.id = bookings.property_id
        AND hp.user_id = auth.uid()
    )
  );

-- Only the property owner can update their property
CREATE POLICY "host_owns_property" ON properties
  FOR UPDATE USING (
    host_id = (SELECT id FROM host_profiles WHERE user_id = auth.uid())
  );

-- Transactions are insert-only from the application; never updatable by users
CREATE POLICY "transactions_insert_only" ON transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- No UPDATE or DELETE policy — transactions are immutable
```

**Rule:** Use `supabase.auth.getUser()` in server actions for authorization, then rely on RLS as the safety net. Never disable RLS on any table containing user data.

### Prevent IDOR (Insecure Direct Object Reference)

Never query by ID alone — always scope to the authenticated user:

```ts
// ❌ IDOR — any authenticated user can read any booking by guessing a UUID
const booking = await db.query.bookings.findFirst({
  where: eq(bookings.id, bookingId),
});

// ✅ Always scope to the current user
const booking = await db.query.bookings.findFirst({
  where: and(
    eq(bookings.id, bookingId),
    eq(bookings.guestId, user.id) // enforces ownership
  ),
});
if (!booking) throw new Error("Not found"); // same error for missing vs unauthorized
```

---

## Layer 4 — Authentication

### What Supabase provides

- Bcrypt password hashing (built-in, no action needed)
- Secure session management with HttpOnly cookies
- JWT with short expiry + automatic refresh via `proxy.ts`
- Google OAuth with PKCE
- Email verification on signup

### Rules to enforce in code

**Never reveal whether an email exists** in error messages:

```ts
// ❌ Leaks user enumeration
if (!user) throw new Error("No account found with this email");
if (!passwordMatch) throw new Error("Wrong password");

// ✅ Generic message for both cases
if (!user || !passwordMatch) throw new Error("Invalid credentials");
```

**Password requirements** — enforce in the Zod schema before passing to Supabase:

```ts
export const passwordSchema = z
  .string()
  .min(8, "Must be at least 8 characters")
  .max(128, "Too long")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");
```

**OAuth callback** — the current `callback/page.tsx` only redirects on `SIGNED_IN`. It should also handle errors:

```ts
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN") {
    router.push(redirectTo ?? "/");
  } else if (event === "SIGNED_OUT") {
    router.push("/login");
  }
  // Log unexpected events for monitoring
});
```

**Session logout** — always call `supabase.auth.signOut()` server-side to invalidate the session, not just clear the cookie client-side.

---

## Layer 5 — Payment Security

### PCI compliance

Credit card numbers **never touch our server.** Opn and Stripe tokenize cards on their own servers. Our server only receives a payment token. This is non-negotiable — never add a form field that collects raw card numbers.

### Webhook signature verification

Every webhook endpoint (`/api/webhooks/stripe`, `/api/webhooks/opn`) **must** verify the request signature before processing. Without this, anyone can send a fake "payment succeeded" event.

```ts
// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { serverEnv } from "@/config/env.server";

export async function POST(request: NextRequest) {
  const body = await request.text(); // must be raw text, not parsed JSON
  const signature = request.headers.get("stripe-signature");

  if (!signature || !serverEnv.STRIPE_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, serverEnv.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // Process only after signature is verified
  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSuccess(event.data.object);
      break;
  }

  return new Response("OK", { status: 200 });
}
```

The same pattern applies to Opn webhooks using their HMAC signature header.

### Amount validation

Never trust the amount sent from the client. Always recalculate server-side:

```ts
// ❌ Trusting client-sent amount
const { amount } = await request.json();
await chargeCard(amount);

// ✅ Recalculate from the booking record
const booking = await getBookingById(bookingId, user.id);
const amount = calculateBookingTotal(booking); // server-side calculation
await chargeCard(amount);
```

### Idempotency keys

All payment operations must use idempotency keys to prevent duplicate charges on retries:

```ts
// Each unique charge attempt gets a unique key
const idempotencyKey = `booking-${bookingId}-${Date.now()}`;
await stripe.paymentIntents.create(
  { amount, currency: "thb", ... },
  { idempotencyKey }
);
```

---

## Layer 6 — Input Handling & XSS

### User-generated content

Property descriptions, review text, and messages allow free-form input from users. This content must be sanitized before rendering.

**Rule:** Never use `dangerouslySetInnerHTML` with user-provided content. React escapes by default — don't bypass it.

```tsx
// ❌ XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: property.description }} />

// ✅ Let React escape it
<p>{property.description}</p>

// ✅ If HTML formatting is needed, sanitize first with a library like DOMPurify
import DOMPurify from "isomorphic-dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(property.description) }} />
```

### File uploads

Validate type and size server-side — never trust the client's `Content-Type`:

```ts
// Server-side validation for property photo uploads
const MAX_SIZE = 10 * 1024 * 1024; // 10MB (matches MAX_UPLOAD_SIZE_BYTES constant)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

if (file.size > MAX_SIZE) throw new Error("File too large");
if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Invalid file type");

// Also verify magic bytes — don't trust the reported MIME type
const buffer = Buffer.from(await file.arrayBuffer());
const { fileTypeFromBuffer } = await import("file-type");
const detected = await fileTypeFromBuffer(buffer);
if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
  throw new Error("Invalid file content");
}
```

### URL parameters

Booking checkout passes dates and guest count as search params. Always validate them:

```ts
// app/[locale]/(guest)/booking/checkout/[propertyId]/page.tsx
const checkoutParamsSchema = z
  .object({
    checkIn: z.string().date(),
    checkOut: z.string().date(),
    guests: z.coerce.number().int().min(1).max(100),
  })
  .refine((d) => d.checkOut > d.checkIn, "Check-out must be after check-in");

export default async function CheckoutPage({ searchParams }) {
  const params = checkoutParamsSchema.safeParse(searchParams);
  if (!params.success) redirect(`/${locale}/search`); // invalid params — send back
  // ...
}
```

---

## Layer 7 — Secrets Management

### Rules

- All secrets live in environment variables — never in source code or git history
- `env.server.ts` and `env.client.ts` validate presence and format at startup
- `.env.local` is gitignored — never commit it
- Rotate any secret immediately if it appears in a commit, log, or error message

### What counts as a secret

- Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) — **never expose to the client**
- Stripe/Opn secret keys — server-only
- Webhook signing secrets — server-only
- `CRON_SECRET` — prevents unauthorized cron endpoint calls
- `DATABASE_URL` — server-only

### Logging rules

Never log secrets, tokens, passwords, or card data:

```ts
// ❌ Logs a sensitive value
logger.info({ user, token, paymentDetails });

// ✅ Log only safe identifiers
logger.info({ userId: user.id, action: "payment.initiated", bookingId });
```

---

## Layer 8 — Bot Protection (Cloudflare Turnstile)

Turnstile tokens must be **verified server-side** before processing the action. The client-side widget proving "I'm human" is meaningless without server-side verification.

```ts
// Verify Turnstile token in server actions that use it
async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret: serverEnv.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  });
  const data = await res.json();
  return data.success === true;
}

// In your login/register action:
export async function loginAction(raw: unknown) {
  const { email, password, turnstileToken } = LoginSchema.parse(raw);

  const isHuman = await verifyTurnstile(turnstileToken);
  if (!isHuman) throw new Error("Bot verification failed");

  // proceed with login ...
}
```

Apply Turnstile to: login, register, forgot password, and checkout.

---

## Layer 9 — Audit Logging

Every financial and security event must be written to the `audit_log` table. This is required for dispute resolution and regulatory compliance.

### Events to log

| Event                                      | Severity       |
| ------------------------------------------ | -------------- |
| User login (success + failure)             | Info / Warning |
| Password reset requested                   | Info           |
| Role change (guest → host)                 | Warning        |
| Booking created / cancelled                | Info           |
| Payment charged                            | Info           |
| Payout disbursed                           | Info           |
| Refund issued                              | Warning        |
| Admin action (property approved/suspended) | Warning        |
| Webhook received                           | Info           |
| Rate limit triggered                       | Warning        |

### Immutability

The `audit_log` table must never allow UPDATE or DELETE. Enforce at the RLS level:

```sql
-- Allow insert from authenticated service role only
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_insert_only" ON audit_log FOR INSERT WITH CHECK (true);
-- No SELECT, UPDATE, or DELETE policies for non-admin roles
```

---

## Pre-launch Security Checklist

### Authentication & Sessions

- [ ] `getUser()` used (not `getSession()`) in all server-side auth checks
- [ ] Role enforcement added to `proxy.ts`
- [ ] Login errors are generic (don't reveal if email exists)
- [ ] Password policy enforced in Zod schema
- [ ] OAuth callback handles error states

### Authorization

- [ ] RLS policies written and tested for all tables with user data
- [ ] Every server action scopes DB queries to the authenticated user
- [ ] Admin routes verified to be inaccessible to guest/host roles

### Input Validation

- [ ] All server action inputs validated with Zod before use
- [ ] Search params on checkout page validated and sanitized
- [ ] File uploads validated for size, MIME type, and magic bytes

### Infrastructure

- [ ] Security headers added to `next.config.ts` (CSP, HSTS, X-Frame-Options)
- [ ] Booking and payment rate limits wired up in `getRateLimitKey`
- [ ] IP extraction uses `x-vercel-forwarded-for`

### Payments

- [ ] Stripe webhook signature verified before processing events
- [ ] Opn webhook signature verified before processing events
- [ ] Payment amounts recalculated server-side, never trusted from client
- [ ] Idempotency keys used on all charge/payout operations

### Secrets & Logging

- [ ] No secrets in source code or git history
- [ ] Logs contain no passwords, tokens, or card data
- [ ] Audit log RLS prevents UPDATE and DELETE

### Content

- [ ] `dangerouslySetInnerHTML` not used with user content, or DOMPurify applied
- [ ] Turnstile tokens verified server-side on login, register, forgot password, checkout
