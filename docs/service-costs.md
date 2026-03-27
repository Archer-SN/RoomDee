# Service Costs & Pricing Guide

Cost breakdown for every third-party service used in this platform, including free tier limits, upgrade triggers, and vetted alternatives. Updated March 2026.

---

## Summary

| Service              | Category                         | Free Tier                 | First Paid Tier               | Our Pick               |
| -------------------- | -------------------------------- | ------------------------- | ----------------------------- | ---------------------- |
| Vercel               | Hosting                          | 100 GB bandwidth, 1 seat  | $20/user/month                | ✅ Keep                |
| Supabase             | DB + Auth + Storage              | 500 MB DB, 5 GB bandwidth | $25/project/month             | ✅ Keep                |
| Upstash Redis        | Caching / Rate Limiting          | 500K commands/month       | $0.20/100K (PAYG)             | ✅ Keep                |
| Resend               | Transactional Email              | 100 emails/day            | $20/month                     | ✅ Keep                |
| Cloudflare Turnstile | Bot Protection                   | Unlimited verifications   | Enterprise only               | ✅ Keep (free forever) |
| OpenStreetMap tiles  | Maps                             | Technically free          | ~$20–25/month (tile provider) | ⚠️ Swap before launch  |
| Opn Payments         | Thai Payments                    | No free tier              | 1.65%–3.65% per transaction   | ✅ Keep                |
| Stripe               | International Payments + Payouts | No free tier              | 2.9% + $0.30 per transaction  | ✅ Keep                |

---

## Vercel — Hosting & Deployment

**What we use it for:** Next.js app hosting, serverless API routes, cron jobs, preview deployments.

### Pricing

| Plan       | Cost           | Bandwidth              | Edge Requests      | Seats     |
| ---------- | -------------- | ---------------------- | ------------------ | --------- |
| Hobby      | Free           | 100 GB/month           | 1M/month           | 1 only    |
| Pro        | $20/user/month | 1 TB/month (+$0.15/GB) | 10M/month (+$2/1M) | Unlimited |
| Enterprise | Custom         | Custom                 | Custom             | Custom    |

**Free tier breaks when:**

- Bandwidth exceeds 100 GB (hotel listing images are heavy)
- You need a second developer (Hobby is single-seat only)
- You need function execution beyond 60-second timeout

**When to upgrade:** Add the second developer or when bandwidth consistently exceeds 80 GB/month.

### Alternatives

| Provider        | Cost                                           | Notes                                                                                         |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Railway**     | $5/month (Hobby), $20/month (Pro)              | Simpler pricing, no per-seat cost. Good for small teams. No native Next.js edge optimization. |
| **Render**      | Free tier available, $7/month (Starter)        | Cheaper than Vercel Pro for solo devs. Slower cold starts on free tier.                       |
| **Fly.io**      | Pay-as-you-go, ~$3–10/month at small scale     | Docker-based. More control but significantly more DevOps overhead.                            |
| **AWS Amplify** | Free tier, then ~$0.01/build minute + $0.15/GB | Mature but complex. Overkill for a 1-3 person team.                                           |

**Verdict:** Vercel is the best choice for Next.js. Railway is the best alternative if per-seat pricing becomes painful.

---

## Supabase — Database, Auth, Storage, Realtime

**What we use it for:** PostgreSQL database (with PostGIS), user authentication, property photo storage, future real-time messaging.

### Pricing

| Plan | Cost               | DB Storage        | Bandwidth          | Auth MAUs               | File Storage        | Realtime Connections |
| ---- | ------------------ | ----------------- | ------------------ | ----------------------- | ------------------- | -------------------- |
| Free | $0                 | 500 MB            | 5 GB               | 50,000                  | 1 GB                | 200 concurrent       |
| Pro  | $25/project/month  | 8 GB (+$0.125/GB) | 250 GB (+$0.09/GB) | 100,000 (+$0.00325/MAU) | 100 GB (+$0.021/GB) | 500 concurrent       |
| Team | $599/project/month | 8 GB (+$0.125/GB) | 250 GB (+$0.09/GB) | Unlimited               | 100 GB (+$0.021/GB) | 500 concurrent       |

**Free tier breaks when:**

- Database storage hits 500 MB (booking records + hotel data fills this within months)
- Project is inactive for 1 week — **Supabase pauses free projects automatically**
- Bandwidth exceeds 5 GB (inevitable once guests load property photos)

**When to upgrade:** Upgrade to Pro ($25/month) before going live. The inactivity pause alone makes Free unsuitable for production.

### Alternatives

| Provider               | Cost                                       | Notes                                                                                                                   |
| ---------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **PlanetScale**        | Free tier, $39/month (Scaler)              | MySQL-based (no PostGIS). Branching for schema changes is excellent. Not suitable for our geo-search requirements.      |
| **Neon**               | Free tier, $19/month (Launch)              | Serverless PostgreSQL, supports PostGIS. Good cold-start latency. No built-in Auth or Storage — need separate services. |
| **Railway PostgreSQL** | ~$5–15/month                               | Plain PostgreSQL, no extras. You'd need to add Auth (Clerk/Auth.js) and Storage (S3/Cloudflare R2) separately.          |
| **Firebase**           | Free tier, $25/month (Blaze pay-as-you-go) | NoSQL only. Our highly relational data model (properties → room types → bookings) is a poor fit for document databases. |

**Verdict:** Supabase is the best integrated option for this stack. Neon is the best pure-database alternative if we ever need to split Auth and Storage to separate providers.

---

## Upstash Redis — Caching & Rate Limiting

**What we use it for:** Search result caching (5-minute TTL), rate limiting (login, search, API), checkout room locks (prevents double-booking during payment).

### Pricing

| Plan          | Cost      | Commands            | Storage  | Bandwidth |
| ------------- | --------- | ------------------- | -------- | --------- |
| Free          | $0        | 500K/month total    | 256 MB   | 10 GB     |
| Pay-As-You-Go | $0 base   | $0.20/100K commands | $0.25/GB | Included  |
| Fixed 250MB   | $10/month | Unlimited           | 250 MB   | Included  |
| Fixed 1GB     | $40/month | Unlimited           | 1 GB     | Included  |

**Free tier breaks when:**

- Commands exceed 500K/month (~16K/day). A search page firing 10 Redis lookups per request exhausts free tier at ~1,600 searches/day.

**When to upgrade:** Switch to Pay-As-You-Go when approaching 400K commands/month. At typical early-stage volumes, PAYG costs $2–5/month.

### Alternatives

| Provider                     | Cost                                           | Notes                                                                                                    |
| ---------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Redis Cloud (Redis Inc.)** | Free 30 MB tier, $7/month (Essentials)         | Official Redis. More features (Redis Modules, JSON, Search). More expensive than Upstash at small scale. |
| **Vercel KV**                | Free tier (30K requests/day), $0.20/100K (Pro) | Built on Upstash under the hood. Convenient if already on Vercel Pro, but slightly more expensive.       |
| **Railway Redis**            | ~$5–10/month                                   | Simple, reliable. No serverless autoscaling — fixed instance cost even at zero traffic.                  |

**Verdict:** Upstash is the right choice. Serverless Redis with no idle cost is ideal for a startup with variable traffic.

---

## Resend — Transactional Email

**What we use it for:** Booking confirmations, payment receipts, host payout notifications, password resets (~15 email types).

### Pricing

| Plan  | Cost      | Monthly Emails | Daily Cap | Custom Domains | Overage     |
| ----- | --------- | -------------- | --------- | -------------- | ----------- |
| Free  | $0        | 3,000          | 100/day   | 1              | N/A         |
| Pro   | $20/month | 50,000         | None      | 10             | $0.90/1,000 |
| Scale | $90/month | 100,000        | None      | 1,000          | $0.90/1,000 |

**Free tier breaks when:**

- Daily cap of 100 emails is hit. At 50+ bookings/day (confirmation + host notification = 2 emails each), Free breaks immediately.

**When to upgrade:** Upgrade to Pro ($20/month) before launch.

### Alternatives

| Provider                  | Cost                                               | Notes                                                                                                                                                                                                 |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SendGrid**              | Free 100 emails/day, $19.95/month (Essentials 50K) | Industry standard. More complex setup. No React Email integration — requires separate template system.                                                                                                |
| **Postmark**              | $15/month (10K emails)                             | Excellent deliverability, focused on transactional only. No React Email support natively. More expensive per email at low volume.                                                                     |
| **AWS SES**               | $0.10/1,000 emails                                 | Cheapest at scale by far (~$5/month for 50K emails vs Resend's $20). Requires significant setup work, no hosted dashboard, harder deliverability management. Worth considering at 100K+ emails/month. |
| **Brevo (ex-Sendinblue)** | Free 300 emails/day, $25/month (Starter 20K)       | Good deliverability. No React Email support.                                                                                                                                                          |

**Verdict:** Resend is the best choice for a Next.js/React stack due to React Email integration. Switch to AWS SES at scale (100K+ emails/month) when the $0.10/1,000 rate makes a significant difference.

---

## Cloudflare Turnstile — Bot Protection

**What we use it for:** Protecting login, register, password reset, and checkout forms from bots and brute-force attacks.

### Pricing

| Plan       | Cost           | Widgets                | Verifications/month |
| ---------- | -------------- | ---------------------- | ------------------- |
| Free       | $0             | 20 (10 hostnames each) | Unlimited           |
| Enterprise | ~$2,000+/month | Unlimited              | Unlimited           |

**Free tier breaks when:** It doesn't. 20 widgets with unlimited verifications covers every conceivable use case for a startup.

### Alternatives

| Provider                | Cost                                     | Notes                                                                                                          |
| ----------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **hCaptcha**            | Free tier available, $99/month (Pro)     | Privacy-focused. Free tier shows challenges to some users — slightly worse UX than Turnstile's invisible mode. |
| **Google reCAPTCHA v3** | Free up to 1M/month, then custom pricing | Score-based (no user interaction). Privacy concerns — sends data to Google. Less GDPR-friendly for EU guests.  |
| **Arkose Labs**         | Enterprise pricing only                  | Overkill for a startup.                                                                                        |

**Verdict:** Turnstile is free, invisible, and requires no user interaction. No reason to switch.

---

## Maps — Leaflet + OpenStreetMap

**What we use it for:** Property search map with price pins, property detail location map.

### Current Setup Risk

OpenStreetMap's tile server (`tile.openstreetmap.org`) is free but has a critical policy restriction: **commercial services may be blocked without prior notice**. Using it directly in production violates OSM's tile usage policy.

**Switch to a commercial tile provider before launch.**

### Tile Provider Options

| Provider        | Free Tier                      | Paid                             | Notes                                                                                |
| --------------- | ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------ |
| **Stadia Maps** | 200K requests/month            | From $20/month                   | OSM-based. Simple API key setup. Recommended.                                        |
| **MapTiler**    | 100K tiles/month               | From $25/month                   | OSM-based + satellite. Slightly more expensive.                                      |
| **Jawg Maps**   | 75K map views/month            | From €39/month                   | Good quality tiles. More expensive.                                                  |
| **Protomaps**   | Self-host free                 | $20/month (hosted)               | Open source. Cheapest at scale if self-hosted. More setup work.                      |
| **Mapbox**      | 50K map loads/month            | $5/1,000 loads (after free tier) | Best-looking maps. Gets expensive fast at scale — 100K loads/month = $250.           |
| **Google Maps** | $200 credit/month (~28K loads) | $7/1,000 loads                   | Best data quality (especially in Thailand). Expensive at scale. Vendor lock-in risk. |

**Our estimated usage:** ~10–20 tiles per map view. At 5,000 property page views/month = ~75–100K tile requests. Stadia Maps free tier covers this exactly.

**Verdict:** Swap OSM tiles to **Stadia Maps** before launch. Free tier covers early traffic, $20/month after.

---

## Opn Payments (Omise) — Thai Payments

**What we use it for:** PromptPay QR payments, Thai credit/debit cards, TrueMoney Wallet, bank installments for Thai guests.

### Pricing (all fees include 7% Thai VAT)

| Payment Method                                   | Fee          |
| ------------------------------------------------ | ------------ |
| Credit/Debit cards (Visa, Mastercard, JCB, Amex) | 3.65%        |
| PromptPay (QR bank transfer)                     | 1.65%        |
| TrueMoney Wallet                                 | 2.65%        |
| ShopeePay                                        | 2.65%        |
| Direct debit / iBanking                          | 10 THB flat  |
| Bank transfer ≤2M THB                            | 20 THB flat  |
| Bank transfer >2M THB                            | 150 THB flat |
| BNPL (SPayLater)                                 | 5%           |
| BNPL (Atome)                                     | 6%           |

No monthly fee. No setup fee.

**Cost on a 3,000 THB booking:**

- PromptPay: **~49.50 THB** (1.65%)
- Card: **~109.50 THB** (3.65%)

**Recommendation:** Default to PromptPay at checkout for Thai guests. Display it first and promote the lower fee (or pass savings to the guest as a discount).

### Alternatives

| Provider              | Key Fee                               | Notes                                                                                                                  |
| --------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **2C2P**              | ~2.5–3.5% (cards), supports PromptPay | Thai-founded, strong local support. More enterprise-focused. Higher integration complexity.                            |
| **KBank (KPayment)**  | ~2.5–3%                               | Popular in Thailand. PromptPay supported. Requires Thai business entity and bank account.                              |
| **Stripe (Thailand)** | 3.6% + ฿10                            | Stripe entered Thailand in 2023. No PromptPay support yet — cards only. Not suitable as primary Thai payment provider. |

**Verdict:** Opn is the right choice for Thai payments. It has the lowest PromptPay fee and the widest local payment method coverage.

---

## Stripe — International Payments & Host Payouts

**What we use it for:** International card payments (Visa/Mastercard/Amex from non-Thai banks), host payout disbursements via Stripe Connect.

### Payment Processing Fees

| Transaction Type             | Fee          |
| ---------------------------- | ------------ |
| Domestic card (same country) | 2.9% + $0.30 |
| International card           | 3.1% + $0.30 |
| Cross-border surcharge       | +1.5%        |
| Currency conversion (FX)     | +1%          |

**Cost on a $100 USD booking from an international guest:**

- Base: 3.1% + $0.30 = $3.40
- Cross-border: +1.5% = $1.50
- **Total: ~$4.90** (4.9%)

### Stripe Connect — Host Payouts

| Account Type | Monthly Fee             | Per Payout Fee               | Best For                                           |
| ------------ | ----------------------- | ---------------------------- | -------------------------------------------------- |
| Standard     | $0                      | $0 (host pays fees directly) | Hosts manage their own Stripe account              |
| Express      | $2/active account/month | 0.25% + $0.25                | Our use case — marketplace with managed onboarding |
| Custom       | $2/active account/month | 0.25% + $0.25                | White-label, full UI control                       |

An account is "active" in any month a payout is sent. 100 active hosts = $200/month in Connect fees alone.

**Cost of paying out 2,800 THB to a host (after 7% commission on 3,000 THB booking):**

- Express Connect fee: $2/month (amortized) + 0.25% + $0.25 ≈ ~$0.32 per payout

### Alternatives

| Provider           | Notes                                                                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adyen**          | Lower per-transaction rates at high volume (interchange++ pricing). Minimum ~$120/month platform fee. Worth evaluating at $1M+/month GMV.                              |
| **Wise Business**  | Excellent for international payouts with lower FX fees (0.3–0.5% vs Stripe's 1%). No payment processing — payout-only. Could complement Stripe for host disbursements. |
| **PayPal Payouts** | $0.25/payout to PayPal accounts, higher for bank transfers. Widely used but high buyer fees and dispute rates on marketplace transactions.                             |

**Verdict:** Stripe is the right choice for international payments and host payouts at startup scale. Evaluate Adyen when monthly GMV exceeds $1M.

---

## Cost Projections by Growth Stage

### Stage 1 — Pre-launch / Development (~$0–25/month)

| Service                  | Cost                              |
| ------------------------ | --------------------------------- |
| Vercel Hobby             | $0                                |
| Supabase Free            | $0 (⚠️ upgrade before going live) |
| Upstash Free             | $0                                |
| Resend Free              | $0                                |
| Turnstile                | $0                                |
| Stadia Maps Free         | $0                                |
| **Total infrastructure** | **$0/month**                      |

---

### Stage 2 — Live, Early Traction (~50–200 bookings/month)

| Service                  | Cost                 | Trigger                          |
| ------------------------ | -------------------- | -------------------------------- |
| Vercel Pro (1 seat)      | $20/month            | 2nd developer or bandwidth       |
| Supabase Pro             | $25/month            | Production stability             |
| Upstash PAYG             | ~$2–5/month          | ~1–2M commands/month             |
| Resend Pro               | $20/month            | >100 emails/day                  |
| Stadia Maps              | $0 (free tier)       | <200K tile requests              |
| **Total infrastructure** | **~$67–70/month**    |                                  |
| Opn (avg 2% blended)     | ~600–2,400 THB/month | 50–200 bookings at 3,000 THB avg |
| Stripe Express Connect   | ~$10–20/month        | Active host payouts              |

---

### Stage 3 — Growing (~1,000+ bookings/month)

| Service                  | Cost                                  |
| ------------------------ | ------------------------------------- |
| Vercel Pro (2–3 seats)   | $40–60/month                          |
| Supabase Pro             | $25–50/month (storage overages)       |
| Upstash PAYG             | ~$20–40/month                         |
| Resend Pro               | $20/month                             |
| Stadia Maps              | $20/month                             |
| **Total infrastructure** | **~$125–190/month**                   |
| Opn (avg 2% blended)     | ~12,000 THB/month on 3M THB GMV       |
| Stripe Connect           | ~$100–200/month (50–100 active hosts) |

---

### Stage 4 — Scale (~10,000+ bookings/month)

At this point, payment processing fees ($15,000–20,000 THB/month) dwarf infrastructure costs. Key changes to evaluate:

- **Supabase Team** ($599/month) for dedicated compute and unlimited MAUs
- **AWS SES** instead of Resend (~$5/month vs $90/month for 100K emails)
- **Cloudflare Images** instead of Supabase Storage for image CDN ($5/month + $1/100K transformations)
- **Adyen** instead of Stripe for lower interchange++ rates at high GMV
- **Wise Business** for host payouts to reduce FX fees on international disbursements

---

## Key Cost Levers

1. **Promote PromptPay** — at 1.65% vs 3.65% for cards, steering Thai guests to PromptPay cuts payment fees by more than half on domestic transactions.
2. **Image optimization** — hotel listing images are the biggest bandwidth driver. Using `next/image` with proper sizing prevents Vercel and Supabase Storage bandwidth overages.
3. **Redis TTL tuning** — longer cache TTLs on search results reduce Upstash command counts significantly without hurting user experience.
4. **Payout batching** — batching weekly host payouts instead of daily reduces Stripe Connect per-payout fees.
5. **AWS SES at scale** — Resend at $0.90/1,000 emails vs SES at $0.10/1,000 emails. Switch when monthly email volume exceeds ~50,000.
