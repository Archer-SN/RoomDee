import {
  pgTable, uuid, text, boolean, timestamp, primaryKey,
} from "drizzle-orm/pg-core";
import { USER_STATUSES, ROLES, LOCALES, CURRENCIES } from "@/shared/types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // from Supabase Auth
  email: text("email").unique().notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  status: text("status", { enum: USER_STATUSES }).notNull().default("active"),
  preferredLocale: text("preferred_locale", { enum: LOCALES }).notNull().default("th"),
  preferredCurrency: text("preferred_currency", { enum: CURRENCIES }).notNull().default("THB"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable("user_roles", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ROLES }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.role] }),
]);

export const hostProfiles = pgTable("host_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").unique().notNull().references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name"),
  taxId: text("tax_id"), // encrypted via pgcrypto at app level
  opnConnectId: text("opn_connect_id"),
  stripeConnectId: text("stripe_connect_id"),
  commissionRate: text("commission_rate").notNull().default("0.15"), // stored as text, parsed as decimal
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
