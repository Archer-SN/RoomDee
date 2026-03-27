import {
  pgTable, uuid, text, integer, timestamp,
} from "drizzle-orm/pg-core";
import { properties } from "./property";
import { LOCALES } from "@/shared/types";

export const roomTypes = pgTable("room_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  totalUnits: integer("total_units").notNull().default(1),
  maxGuests: integer("max_guests").notNull(),
  bedrooms: integer("bedrooms").notNull().default(1),
  bathrooms: integer("bathrooms").notNull().default(1),
  minStayNights: integer("min_stay_nights").notNull().default(1),
  maxStayNights: integer("max_stay_nights"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomTypeTranslations = pgTable("room_type_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  locale: text("locale", { enum: LOCALES }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
});

export const roomTypePhotos = pgTable("room_type_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomTypeId: uuid("room_type_id").notNull().references(() => roomTypes.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(), // Supabase Storage path, e.g. "room-types/{id}/photo.webp"
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});
