import {
  pgTable, uuid, text, numeric, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { hostProfiles } from "./user";
import { PAYMENT_PROVIDERS, TRANSACTION_TYPES, CURRENCIES } from "@/shared/types";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull(), // FK to bookings — set after bookings table is created
  provider: text("provider", { enum: PAYMENT_PROVIDERS }).notNull(),
  providerTxId: text("provider_tx_id").notNull(),
  providerEventId: text("provider_event_id"),
  type: text("type", { enum: TRANSACTION_TYPES }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency", { enum: CURRENCIES }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "refunded"] }).notNull().default("pending"),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // UNIQUE(provider, provider_event_id) added via migration SQL
});

export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id").notNull().references(() => hostProfiles.id),
  bookingId: uuid("booking_id").notNull(), // FK to bookings — set after bookings table is created
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency", { enum: CURRENCIES }).notNull(),
  status: text("status", { enum: ["pending", "hold", "processing", "completed", "failed"] }).notNull().default("pending"),
  holdUntil: timestamp("hold_until", { withTimezone: true }),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
