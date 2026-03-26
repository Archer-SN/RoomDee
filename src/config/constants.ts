export const DEFAULT_LOCALE = "th" as const;
export const DEFAULT_CURRENCY = "THB" as const;
export const DEFAULT_COMMISSION_RATE = 0.15;
export const CHECKOUT_LOCK_TTL_SECONDS = 900; // 15 minutes
export const PAYOUT_HOLD_HOURS = 48;
export const HOST_APPROVAL_TIMEOUT_HOURS = 24;
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
