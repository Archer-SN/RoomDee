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
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
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

  // Merge Supabase session cookies into intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
