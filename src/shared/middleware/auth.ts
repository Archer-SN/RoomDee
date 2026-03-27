import type { Role } from "@/shared/types";

// Route group → required role mapping
const PROTECTED_ROUTES: Record<string, Role> = {
  "(host)": "host",
  "(admin)": "admin",
};

export function getRequiredRole(pathname: string): Role | null {
  for (const [group, role] of Object.entries(PROTECTED_ROUTES)) {
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
