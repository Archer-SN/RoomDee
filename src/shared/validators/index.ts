import { z } from "zod";
import {
  LOCALES, CURRENCIES, PROPERTY_TYPES, BOOKING_MODES,
  PAYMENT_POLICIES, CANCELLATION_POLICIES,
} from "@/shared/types";

// Date range — check-out must be after check-in
export const dateRangeSchema = z.object({
  checkIn: z.string().date(),
  checkOut: z.string().date(),
}).refine((data) => data.checkOut > data.checkIn, {
  message: "Check-out must be after check-in",
  path: ["checkOut"],
});

// Money — positive, two decimal places
export const moneySchema = z.string().regex(
  /^\d+(\.\d{1,2})?$/,
  "Must be a valid amount with up to 2 decimal places",
).refine((val) => parseFloat(val) > 0, {
  message: "Amount must be positive",
});

// Pagination — cursor-based
export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

// Locale
export const localeSchema = z.enum(LOCALES);

// Currency
export const currencySchema = z.enum(CURRENCIES);

// Property type
export const propertyTypeSchema = z.enum(PROPERTY_TYPES);

// UUID
export const uuidSchema = z.string().uuid();

// Guest count validation
export const guestCountSchema = z.object({
  guestsCount: z.number().int().min(1).max(100),
  roomsCount: z.number().int().min(1).max(50),
  maxGuestsPerRoom: z.number().int().min(1),
}).refine((data) => data.guestsCount <= data.roomsCount * data.maxGuestsPerRoom, {
  message: "Guest count exceeds room capacity",
  path: ["guestsCount"],
});
