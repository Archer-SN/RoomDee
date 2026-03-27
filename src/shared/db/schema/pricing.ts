import {
  pgTable, uuid, text, numeric, date, timestamp,
} from "drizzle-orm/pg-core";
import { roomTypes } from "./room-type";
import { properties } from "./property";
import { CURRENCIES } from "@/shared/types";

export const roomTypePricing = pgTable("room_type_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").unique().notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  nightlyRate: numeric("nightly_rate", { precision: 12, scale: 2 }).notNull(),
  weeklyDiscount: numeric("weekly_discount", { precision: 4, scale: 2 }).notNull().default("0.00"),
  monthlyDiscount: numeric("monthly_discount", { precision: 4, scale: 2 }).notNull().default("0.00"),
  depositPercentage: numeric("deposit_percentage", { precision: 4, scale: 2 }).notNull().default("0.00"),
  currency: text("currency", { enum: CURRENCIES }).notNull().default("THB"),
});

export const seasonalPricing = pgTable("seasonal_pricing", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  nightlyRate: numeric("nightly_rate", { precision: 12, scale: 2 }).notNull(),
  // EXCLUDE constraint for overlapping dates added via custom migration SQL
});

export const pricingSuggestions = pgTable("pricing_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  suggestedRate: numeric("suggested_rate", { precision: 12, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  dateRangeStart: date("date_range_start").notNull(),
  dateRangeEnd: date("date_range_end").notNull(),
  status: text("status", { enum: ["pending", "accepted", "dismissed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
