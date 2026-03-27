-- PostGIS location column (replace lat/lng text columns in Drizzle schema)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);
-- Backfill: UPDATE properties SET location = ST_SetSRID(ST_MakePoint(longitude::float, latitude::float), 4326);

-- Unique constraints
ALTER TABLE property_translations ADD CONSTRAINT uq_property_locale UNIQUE (property_id, locale);
ALTER TABLE amenity_translations ADD CONSTRAINT uq_amenity_locale UNIQUE (amenity_id, locale);
ALTER TABLE room_type_translations ADD CONSTRAINT uq_room_type_locale UNIQUE (room_type_id, locale);
ALTER TABLE availability ADD CONSTRAINT uq_availability_room_date UNIQUE (room_type_id, date);
ALTER TABLE transactions ADD CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id);

-- FK constraints not expressible without circular Drizzle imports
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id);
ALTER TABLE payouts ADD CONSTRAINT fk_payouts_booking
  FOREIGN KEY (booking_id) REFERENCES bookings(id);

-- Check constraints
ALTER TABLE availability ADD CONSTRAINT chk_available_count CHECK (available_count >= 0);

-- Seasonal pricing overlap prevention (requires btree_gist extension)
ALTER TABLE seasonal_pricing ADD CONSTRAINT excl_seasonal_overlap
  EXCLUDE USING gist (
    room_type_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_property_translations_search_en ON property_translations
  USING GIN (to_tsvector('english', name || ' ' || description)) WHERE locale = 'en';
CREATE INDEX IF NOT EXISTS idx_property_translations_search_th ON property_translations
  USING GIN (to_tsvector('simple', name || ' ' || description)) WHERE locale = 'th';
CREATE INDEX IF NOT EXISTS idx_availability_room_date ON availability (room_type_id, date, status);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings (guest_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings (property_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties (type, pet_friendly) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_transactions_booking ON transactions (booking_id);
CREATE INDEX IF NOT EXISTS idx_payouts_hold ON payouts (status, hold_until) WHERE status = 'hold';
CREATE INDEX IF NOT EXISTS idx_property_translations_trgm ON property_translations
  USING GIN ((city || ' ' || province) gin_trgm_ops);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_properties BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_bookings BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
