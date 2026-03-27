import {
  pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb,
} from "drizzle-orm/pg-core";
import { properties } from "./property";
import { users } from "./user";

export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").unique().notNull(),
  discountType: text("discount_type", { enum: ["percentage", "fixed_amount"] }).notNull(),
  discountValue: numeric("discount_value", { precision: 12, scale: 2 }).notNull(),
  sponsor: text("sponsor"),
  conditions: jsonb("conditions").default({}), // min_nights, min_amount, applicable_types, etc.
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  propertyId: uuid("property_id").references(() => properties.id, { onDelete: "cascade" }), // null = platform-wide
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
