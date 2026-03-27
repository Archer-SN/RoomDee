import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/shared/lib/redis";

type RateLimitConfig = {
  requests: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
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
