import { pgTable, uuid, text, boolean, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { hostProfiles } from "./user";
import {
  PROPERTY_TYPES,
  PROPERTY_STATUSES,
  BOOKING_MODES,
  PAYMENT_POLICIES,
  CANCELLATION_POLICIES,
  LOCALES,
} from "@/shared/types";

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostId: uuid("host_id")
    .notNull()
    .references(() => hostProfiles.id, { onDelete: "cascade" }),
  slug: text("slug").unique().notNull(),
  type: text("type", { enum: PROPERTY_TYPES }).notNull(),
  status: text("status", { enum: PROPERTY_STATUSES }).notNull().default("draft"),
  bookingMode: text("booking_mode", { enum: BOOKING_MODES }).notNull().default("instant"),
  paymentPolicy: text("payment_policy", { enum: PAYMENT_POLICIES })
    .notNull()
    .default("full_upfront"),
  cancellationPolicy: text("cancellation_policy", { enum: CANCELLATION_POLICIES })
    .notNull()
    .default("moderate"),
  channexPropertyId: text("channex_property_id"),
  petFriendly: boolean("pet_friendly").notNull().default(false),
  // PostGIS location stored as text — we use raw SQL for geo queries
  // Actual column type: GEOGRAPHY(POINT, 4326) — created via migration SQL
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const propertyTranslations = pgTable("property_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  locale: text("locale", { enum: LOCALES }).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
});

export const propertyPhotos = pgTable("property_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(), // Supabase Storage path, e.g. "properties/{id}/photo.webp"
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  altText: text("alt_text"),
});

export const amenities = pgTable("amenities", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().notNull(),
  icon: text("icon").notNull(),
});

export const amenityTranslations = pgTable("amenity_translations", {
  id: uuid("id").primaryKey().defaultRandom(),
  amenityId: uuid("amenity_id")
    .notNull()
    .references(() => amenities.id, { onDelete: "cascade" }),
  locale: text("locale", { enum: LOCALES }).notNull(),
  name: text("name").notNull(),
});

export const propertyAmenities = pgTable(
  "property_amenities",
  {
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    amenityId: uuid("amenity_id")
      .notNull()
      .references(() => amenities.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.propertyId, table.amenityId] })]
);
