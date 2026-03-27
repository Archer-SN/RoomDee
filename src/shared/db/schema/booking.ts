import {
  pgTable, uuid, text, integer, numeric, date, timestamp, check, jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { properties } from "./property";
import { roomTypes } from "./room-type";
import { users } from "./user";
import { transactions } from "./payment";
import { promotions } from "./promotion";
import {
  BOOKING_STATUSES, BOOKING_MODES, CANCELLATION_POLICIES,
  PAYMENT_POLICIES, CURRENCIES,
} from "@/shared/types";

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "restrict" }),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "restrict" }),
  guestId: uuid("guest_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  promotionId: uuid("promotion_id").references(() => promotions.id, { onDelete: "set null" }), // null = no promo
  appliedPromotion: jsonb("applied_promotion"), // snapshot of promo terms at booking time
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  guestsCount: integer("guests_count").notNull(),
  roomsCount: integer("rooms_count").notNull().default(1),
  status: text("status", { enum: BOOKING_STATUSES }).notNull().default("pending_approval"),
  bookingMode: text("booking_mode", { enum: BOOKING_MODES }).notNull(),
  cancellationPolicy: text("cancellation_policy", { enum: CANCELLATION_POLICIES }).notNull(),
  paymentPolicy: text("payment_policy", { enum: PAYMENT_POLICIES }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  depositAmount: numeric("deposit_amount", { precision: 12, scale: 2 }),
  currency: text("currency", { enum: CURRENCIES }).notNull(),
  specialRequests: text("special_requests"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("check_out_after_check_in", sql`${table.checkOut} > ${table.checkIn}`),
]);

export const paymentSchedule = pgTable("payment_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["upcoming", "paid", "overdue", "failed"] }).notNull().default("upcoming"),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
