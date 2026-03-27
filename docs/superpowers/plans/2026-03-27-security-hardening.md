# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 5 critical security gaps identified in `docs/security-guidelines.md` — security headers, role enforcement, rate limit wiring, IP extraction, and webhook signature verification.

**Architecture:** All changes are isolated to existing infrastructure files (`next.config.ts`, `proxy.ts`, `rate-limit.ts`, `supabase/proxy.ts`) plus two new webhook route handlers. No new dependencies except `stripe` for webhook verification.

**Tech Stack:** Next.js 16, Supabase SSR, Upstash Ratelimit, Stripe SDK, Node.js `crypto` (built-in for Opn HMAC)

**Spec:** `docs/security-guidelines.md`

---

## File Map

| File                                  | Action | What changes                                                 |
| ------------------------------------- | ------ | ------------------------------------------------------------ |
| `next.config.ts`                      | Modify | Add HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) |
| `src/shared/lib/supabase/proxy.ts`    | Modify | Return `user` alongside `response` from `updateSession`      |
| `proxy.ts`                            | Modify | Add role enforcement + fix IP extraction                     |
| `src/shared/middleware/rate-limit.ts` | Modify | Wire booking and payment routes into `getRateLimitKey`       |
| `app/api/webhooks/stripe/route.ts`    | Create | Verify Stripe signature, stub event handler                  |
| `app/api/webhooks/opn/route.ts`       | Create | Verify Opn HMAC signature, stub event handler                |

---

## Task 1: Security headers in next.config.ts

**Files:**

- Modify: `next.config.ts`

- [ ] **Step 1: Replace the empty config with headers**

Full replacement of `next.config.ts`:

```ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/lib/i18n/request.ts");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://res.cloudinary.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.omise.co https://js.stripe.com",
      "frame-src https://challenges.cloudflare.com https://js.stripe.com",
      "font-src 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 2: Verify headers are served**

Run: `pnpm dev`

In a separate terminal:

```bash
curl -I http://localhost:3000/en
```

Expected output includes:

```
x-frame-options: DENY
x-content-type-options: nosniff
content-security-policy: default-src 'self'; ...
referrer-policy: strict-origin-when-cross-origin
```

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "security: add HTTP security headers (CSP, HSTS, X-Frame-Options)"
```

---

## Task 2: Fix supabase/proxy.ts to expose the user

`proxy.ts` needs the authenticated user to enforce roles. Currently `updateSession` calls `getUser()` internally but discards the result. This task makes it available.

**Files:**

- Modify: `src/shared/lib/supabase/proxy.ts`

- [ ] **Step 1: Update `updateSession` to return the user**

Full replacement of `src/shared/lib/supabase/proxy.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export async function updateSession(
  request: NextRequest
): Promise<{ response: NextResponse; user: User | null }> {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: No errors. (The proxy.ts file will show an error on the next step until updated — that's expected here.)

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/supabase/proxy.ts
git commit -m "security: expose user from updateSession for role enforcement"
```

---

## Task 3: Role enforcement + IP fix in proxy.ts

**Files:**

- Modify: `proxy.ts`

- [ ] **Step 1: Rewrite proxy.ts with role enforcement and safe IP extraction**

Full replacement of `proxy.ts`:

```ts
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/shared/lib/i18n/routing";
import { updateSession } from "@/shared/lib/supabase/proxy";
import { rateLimit, getRateLimitKey } from "@/shared/middleware/rate-limit";
import { getRequiredRole, isAuthRoute } from "@/shared/middleware/auth";
import { type NextRequest, NextResponse } from "next/server";
import type { Role } from "@/shared/types";

const intlMiddleware = createIntlMiddleware(routing);

function getClientIp(request: NextRequest): string {
  // On Vercel, x-vercel-forwarded-for is set by the infrastructure and cannot be spoofed
  return (
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "anonymous"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rate limiting (skip for static assets)
  const rateLimitKey = getRateLimitKey(pathname);
  if (rateLimitKey) {
    const ip = getClientIp(request);
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
        }
      );
    }
  }

  // 2. Supabase session refresh — also returns the authenticated user
  const { response: supabaseResponse, user } = await updateSession(request);

  // 3. Role-based route protection
  const requiredRole = getRequiredRole(pathname);
  if (requiredRole) {
    if (!user) {
      // Not logged in — redirect to login, preserving the intended destination
      const locale = pathname.split("/")[1] ?? "th";
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = user.user_metadata?.role as Role | undefined;
    if (userRole !== requiredRole) {
      // Wrong role — redirect to home (don't reveal the route exists)
      const locale = pathname.split("/")[1] ?? "th";
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  // 4. i18n locale routing
  const intlResponse = intlMiddleware(request);

  // Merge Supabase session cookies into intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Verify protected routes redirect unauthenticated users**

Start dev server: `pnpm dev`

Visit `http://localhost:3000/en/dashboard` in an incognito window (not logged in).

Expected: Redirected to `http://localhost:3000/en/login?redirect=%2Fen%2Fdashboard`

- [ ] **Step 4: Commit**

```bash
git add proxy.ts
git commit -m "security: enforce role-based route protection and harden IP extraction"
```

---

## Task 4: Wire booking and payment rate limits

**Files:**

- Modify: `src/shared/middleware/rate-limit.ts`

- [ ] **Step 1: Add missing routes to `getRateLimitKey`**

Replace only the `getRateLimitKey` function (lines 46–52):

```ts
export function getRateLimitKey(pathname: string): string | null {
  if (pathname.includes("/login") || pathname.includes("/register")) return "auth";
  if (pathname.includes("/forgot-password")) return "forgotPassword";
  if (pathname.includes("/search")) return "search";
  if (pathname.includes("/checkout") || pathname.includes("/booking")) return "booking";
  if (pathname.includes("/api/payment")) return "payment";
  if (pathname.includes("/api/webhooks")) return "webhook";
  return null;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/middleware/rate-limit.ts
git commit -m "security: wire booking and payment rate limits into proxy"
```

---

## Task 5: Stripe webhook route with signature verification

**Files:**

- Create: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Install Stripe SDK**

```bash
pnpm add stripe
```

Expected: `stripe` added to `dependencies` in `package.json`.

- [ ] **Step 2: Create the webhook route**

Create `app/api/webhooks/stripe/route.ts`:

```ts
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { serverEnv } from "@/config/env.server";
import { logger } from "@/shared/lib/logger";

function getStripeClient(): Stripe {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27.acacia",
  });
}

export async function POST(request: NextRequest) {
  if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
    logger.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook not configured", { status: 500 });
  }

  const body = await request.text(); // must be raw text for signature verification
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, signature, serverEnv.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn({ err }, "Stripe webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  logger.info({ eventType: event.type, eventId: event.id }, "Stripe webhook received");

  switch (event.type) {
    case "payment_intent.succeeded":
      // TODO(sub-project-6): handle successful payment
      break;
    case "payment_intent.payment_failed":
      // TODO(sub-project-6): handle failed payment — restore availability
      break;
    case "transfer.created":
      // TODO(sub-project-6): handle host payout confirmed
      break;
    default:
      logger.info({ eventType: event.type }, "Stripe webhook: unhandled event type");
  }

  return new Response("OK", { status: 200 });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/stripe/route.ts package.json pnpm-lock.yaml
git commit -m "security: add Stripe webhook route with signature verification"
```

---

## Task 6: Opn webhook route with HMAC verification

Opn uses HMAC-SHA256 with the webhook secret as the key. The signature is in the `x-opn-signature` header (hex-encoded).

**Files:**

- Create: `app/api/webhooks/opn/route.ts`

- [ ] **Step 1: Create the webhook route**

Create `app/api/webhooks/opn/route.ts`:

```ts
import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { serverEnv } from "@/config/env.server";
import { logger } from "@/shared/lib/logger";

function verifyOpnSignature(body: string, signature: string): boolean {
  if (!serverEnv.OPN_WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", serverEnv.OPN_WEBHOOK_SECRET).update(body).digest("hex");
  // timingSafeEqual prevents timing attacks
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  if (!serverEnv.OPN_WEBHOOK_SECRET) {
    logger.error("OPN_WEBHOOK_SECRET is not configured");
    return new Response("Webhook not configured", { status: 500 });
  }

  const body = await request.text(); // must be raw text for signature verification
  const signature = request.headers.get("x-opn-signature");

  if (!signature) {
    return new Response("Missing x-opn-signature header", { status: 400 });
  }

  if (!verifyOpnSignature(body, signature)) {
    logger.warn("Opn webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const eventKey = event.key as string | undefined;
  logger.info({ eventKey }, "Opn webhook received");

  switch (eventKey) {
    case "charge.complete":
      // TODO(sub-project-6): handle successful PromptPay / card charge
      break;
    case "charge.failed":
      // TODO(sub-project-6): handle failed charge — restore availability
      break;
    default:
      logger.info({ eventKey }, "Opn webhook: unhandled event type");
  }

  return new Response("OK", { status: 200 });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhooks/opn/route.ts
git commit -m "security: add Opn webhook route with HMAC-SHA256 signature verification"
```

---

## Self-Review

**Spec coverage check against `docs/security-guidelines.md`:**

| Requirement                                   | Task                                |
| --------------------------------------------- | ----------------------------------- |
| Security headers (CSP, HSTS, X-Frame-Options) | Task 1 ✅                           |
| Role enforcement in proxy                     | Task 3 ✅                           |
| IP extraction hardening                       | Task 3 ✅                           |
| Booking + payment rate limits wired           | Task 4 ✅                           |
| Stripe webhook signature verification         | Task 5 ✅                           |
| Opn webhook signature verification            | Task 6 ✅                           |
| `updateSession` exposes user                  | Task 2 ✅ (prerequisite for Task 3) |

**Placeholder scan:** No TBDs, TODOs (except the payment logic stubs clearly marked for sub-project-6), or vague instructions.

**Type consistency:**

- `updateSession` returns `{ response: NextResponse; user: User | null }` in Task 2 — destructured as `{ response: supabaseResponse, user }` in Task 3 ✅
- `getRequiredRole` returns `Role | null` — consumed with `if (requiredRole)` guard in Task 3 ✅
- `user.user_metadata?.role` cast as `Role | undefined` — compared against `requiredRole: Role` safely ✅
- `serverEnv.STRIPE_WEBHOOK_SECRET` and `serverEnv.OPN_WEBHOOK_SECRET` are `string | undefined` — guarded before use in Tasks 5 and 6 ✅
