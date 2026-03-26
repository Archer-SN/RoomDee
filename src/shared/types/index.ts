export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];

export const CURRENCIES = ["THB", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ROLES = ["guest", "host", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const PROPERTY_TYPES = ["hotel", "resort", "condo", "rental_house"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = ["draft", "pending_review", "active", "suspended", "archived"] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const BOOKING_MODES = ["instant", "request"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

export const PAYMENT_POLICIES = ["full_upfront", "deposit", "monthly"] as const;
export type PaymentPolicy = (typeof PAYMENT_POLICIES)[number];

export const CANCELLATION_POLICIES = ["flexible", "moderate", "strict", "non_refundable"] as const;
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

export const BOOKING_STATUSES = [
  "pending_approval", "pending_payment", "confirmed",
  "checked_in", "completed", "cancelled", "rejected",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const TRANSACTION_TYPES = ["charge", "refund", "deposit", "installment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_PROVIDERS = ["opn", "stripe"] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const USER_STATUSES = ["active", "suspended", "banned"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
