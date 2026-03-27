# Good Practices

Standards and conventions for this codebase. Read this before contributing.

---

## Git

### Branching

```
main                        # production-ready, always deployable
feat/sub-project-2          # sub-project branches (from main)
feat/host-property-form     # feature branches (from the sub-project branch)
fix/checkout-lock-ttl       # bug fix branches
```

- Branch off `main` for new sub-projects
- Branch off the sub-project branch for individual features within it
- Never commit directly to `main`

### Commit messages

Use the conventional commits format:

```
feat: add seasonal pricing override UI
fix: prevent double-booking when Redis lock expires
chore: upgrade drizzle-orm to 0.32
docs: add payout flow to design spec
refactor: extract booking status machine to shared util
```

**Rules:**
- Present tense, imperative mood ("add" not "added")
- One logical change per commit — don't batch unrelated changes
- If you need "and" in the message, it should probably be two commits

### Pull requests

- One PR per feature or fix — keep them small and reviewable
- PR title follows the same conventional commit format
- Link to the relevant spec or Jira ticket in the description
- Self-review your diff before requesting review — remove debug logs, commented-out code, and `TODO`s that belong in tickets

---

## Code Structure

### Module pattern

Business logic lives in `src/modules/`. Each module is self-contained:

```
src/modules/booking/
├── actions/          # Server actions (mutations)
│   ├── create-booking.ts
│   └── cancel-booking.ts
├── queries/          # Database reads
│   ├── get-booking.ts
│   └── list-bookings.ts
├── components/       # React components owned by this module
├── validators/       # Zod schemas for this module's inputs
├── __tests__/        # Unit and integration tests
├── types.ts          # Module-specific TypeScript types
└── index.ts          # Public API — only export what other modules need
```

**The rule:** modules communicate through each other's `index.ts`. Never import directly from another module's internal files.

```ts
// Good
import { getBooking } from "@/modules/booking";

// Bad — reaches into internals
import { getBooking } from "@/modules/booking/queries/get-booking";
```

### Shared vs module code

Put code in `src/shared/` only if it is used by 3 or more modules. If only two modules use something, keep it in one of them and import from its `index.ts`.

---

## TypeScript

### Be explicit at boundaries, infer everywhere else

```ts
// Good — explicit at the function boundary, inferred inside
async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const nights = differenceInDays(input.checkOut, input.checkIn); // inferred
  const total = nights * pricing.nightlyRate;                      // inferred
  // ...
}

// Bad — annotating things TypeScript already knows
const nights: number = differenceInDays(input.checkOut, input.checkIn);
```

### Never use `any`

Use `unknown` when the type is genuinely unknown, then narrow it:

```ts
// Bad
function handleWebhook(payload: any) { ... }

// Good
function handleWebhook(payload: unknown) {
  const parsed = webhookSchema.parse(payload); // Zod narrows to the correct type
}
```

### Enums → `as const` arrays

We use `as const` arrays (defined in `src/shared/types/index.ts`) instead of TypeScript enums. They work with Drizzle's `{ enum: ... }` and Zod's `z.enum()` without any conversion:

```ts
// Defined once
export const BOOKING_STATUSES = ["pending_approval", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Used in Drizzle
status: text("status", { enum: BOOKING_STATUSES })

// Used in Zod
status: z.enum(BOOKING_STATUSES)
```

### Return types on server actions and queries

Always annotate return types on server actions and query functions. They are the public API of a module.

---

## Database

### Always use Drizzle — never raw SQL in application code

The exception is PostGIS geo queries and window functions, where Drizzle's `sql` tagged template is acceptable:

```ts
// Acceptable — PostGIS doesn't have Drizzle abstractions
const nearby = await db.execute(sql`
  SELECT id, slug, ST_Distance(location, ST_MakePoint(${lng}, ${lat})::geography) AS distance
  FROM properties
  WHERE ST_DWithin(location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
  AND status = 'active'
  ORDER BY distance
  LIMIT ${limit}
`);
```

### Avoid N+1 queries

Use Drizzle's relational queries or explicit joins — never fetch in a loop:

```ts
// Bad — N+1
const bookings = await db.select().from(bookingsTable);
for (const booking of bookings) {
  const property = await db.select().from(propertiesTable).where(eq(propertiesTable.id, booking.propertyId));
}

// Good — single query with join
const bookings = await db.query.bookings.findMany({
  with: { property: true },
});
```

### Numeric money values

Money is stored as `numeric` (Postgres) and returned as `string` by Drizzle. Always parse with `parseFloat()` or a Decimal library before arithmetic. Never do math directly on the string.

```ts
// Bad
const total = booking.totalAmount * 0.85; // NaN — it's a string

// Good
const total = parseFloat(booking.totalAmount) * 0.85;
```

### Migrations

- Schema changes go through Drizzle migrations (`pnpm db:generate`) — never alter tables manually in production
- The custom migration `0001_custom_constraints.sql` must be applied manually after the Drizzle migration (PostGIS, EXCLUDE constraints, indexes, triggers)
- Never edit an already-applied migration file — create a new one

---

## Server Actions

Server actions are the mutation layer. They sit in `src/modules/[module]/actions/`.

### Structure of a server action

```ts
"use server";

import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { db } from "@/shared/db";
import { logger } from "@/shared/lib/logger";

const inputSchema = z.object({
  propertyId: z.string().uuid(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
});

export async function createBooking(rawInput: unknown) {
  // 1. Validate input
  const input = inputSchema.parse(rawInput);

  // 2. Authenticate
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 3. Authorize (does this user own this resource / have this role?)
  // ...

  // 4. Business logic
  // ...

  // 5. Audit log for financial events
  logger.info({ action: "booking.created", userId: user.id }, "Booking created");
}
```

**Rules:**
- Always validate with Zod before touching the database
- Always authenticate via `supabase.auth.getUser()` — never trust client-sent user IDs
- Throw plain `Error` objects with clear messages — the caller handles display
- Log financial events (bookings, payments, payouts) with `logger.info`

---

## Components

### Server components by default

Every component is a Server Component unless it needs browser APIs, event handlers, or React state. Add `"use client"` only when required.

```ts
// Good — no "use client", runs on server, can be async
export default async function PropertyCard({ propertyId }: { propertyId: string }) {
  const property = await getProperty(propertyId); // direct DB call, no fetch
  return <div>{property.name}</div>;
}
```

### Keep components focused

A component should either fetch data or render UI — not both at scale. For complex pages, split into a server component that fetches and a client component that handles interaction.

### Props over context

Prefer passing props explicitly over reaching for React context. Use context only for genuinely global state (locale, theme, auth user).

### Naming

| Type | Convention | Example |
|---|---|---|
| Component files | PascalCase | `PropertyCard.tsx` |
| Component functions | PascalCase | `export default function PropertyCard` |
| Server actions | kebab-case files, camelCase exports | `create-booking.ts` → `createBooking` |
| Query files | kebab-case | `get-property.ts` → `getProperty` |
| Hooks | camelCase, `use` prefix | `useAvailability` |

---

## Validation

### Validate at the boundary

Zod validation happens at the entry point of every server action and API route. Once data is inside the function, trust it.

```ts
// Validate once, at the top
const input = createBookingSchema.parse(rawInput);

// Don't re-validate the same data deeper in the call stack
```

### Use shared validators for common shapes

Common validators live in `src/shared/validators/index.ts`. Use them instead of re-defining date ranges, money amounts, or pagination shapes in each module.

---

## Error Handling

### Server actions throw, UI catches

Server actions throw errors with clear messages. The calling component or form catches them and decides how to display them.

### Financial operations are idempotent

Every transaction and payout has an `idempotency_key`. If a payment request is retried (network failure, double-submit), the same key prevents a double charge.

### Never swallow errors silently

```ts
// Bad
try {
  await processPayment(bookingId);
} catch (e) {
  // nothing
}

// Good
try {
  await processPayment(bookingId);
} catch (error) {
  logger.error({ error, bookingId }, "Payment processing failed");
  throw error; // let the caller handle it
}
```

---

## Security

### Defense in depth — the security layers

Every sensitive request passes through all of these:

1. **`proxy.ts`** — rate limiting and session refresh
2. **Cloudflare Turnstile** — bot protection on auth and checkout forms
3. **Zod validation** — rejects malformed or malicious input
4. **Server action auth check** — `supabase.auth.getUser()` on every mutation
5. **Row Level Security** — database refuses unauthorized access even if app code has a bug

Never skip a layer because "another layer covers it."

### Never trust client-sent IDs for ownership checks

```ts
// Bad — client says they own this booking
const { bookingId, userId } = input;

// Good — get the user from the server-side session
const { data: { user } } = await supabase.auth.getUser();
const booking = await db.query.bookings.findFirst({
  where: and(eq(bookings.id, input.bookingId), eq(bookings.guestId, user.id)),
});
if (!booking) throw new Error("Not found");
```

### Environment variables

- Server-only secrets (API keys, service role key) go in `serverEnv` — they are validated at startup and never exposed to the client
- Public variables (`NEXT_PUBLIC_*`) go in `clientEnv`
- Never import `serverEnv` in a client component — TypeScript will catch this if you keep the separation

---

## i18n

### All user-visible strings go through `next-intl`

No hardcoded English strings in components. Every string must have a key in both `messages/en.json` and `messages/th.json`.

```tsx
// Bad
<button>Book Now</button>

// Good
const t = useTranslations("booking");
<button>{t("bookNow")}</button>
```

### Translation key structure

Use dot-notation namespaces matching the page or feature:

```json
{
  "booking": {
    "bookNow": "Book Now",
    "checkIn": "Check-in",
    "checkOut": "Check-out"
  },
  "property": {
    "amenities": "Amenities",
    "reviewCount": "{count} reviews"
  }
}
```

---

## Performance

### Cache aggressively, invalidate explicitly

Search results are cached in Redis with a 5-minute TTL. When a host updates availability or pricing, explicitly bust the relevant cache keys — don't rely on TTL expiry for time-sensitive data.

### Images

Always use `next/image` with explicit `width` and `height`. Never render an `<img>` tag directly.

```tsx
// Bad
<img src={photo.url} />

// Good
<Image src={photo.url} alt={photo.altText ?? ""} width={800} height={600} />
```

---

## What not to do

- **Don't add abstraction for one use case.** If a pattern appears once, write it inline. Extract it when it appears three times.
- **Don't add error handling for impossible cases.** If a value is guaranteed by TypeScript and the schema, don't add a runtime null-check for it.
- **Don't add console.log in committed code.** Use `logger.debug()` — it's filtered out in production automatically.
- **Don't use `db.execute()` for standard CRUD.** Use Drizzle's query builder. Raw SQL is for geo queries and window functions only.
- **Don't add backwards-compatibility shims.** This is a greenfield project — just change the code.
