
erDiagram
    users {
        UUID id PK
        TEXT email
        TEXT full_name
        TEXT phone
        TEXT avatar_url
        TEXT status
        TEXT preferred_locale
        TEXT preferred_currency
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    user_roles {
        UUID user_id PK,FK
        TEXT role PK
    }

    host_profiles {
        UUID id PK
        UUID user_id FK
        TEXT business_name
        TEXT tax_id
        TEXT opn_connect_id
        TEXT stripe_connect_id
        DECIMAL commission_rate
        BOOLEAN verified
        TIMESTAMPTZ created_at
    }

    properties {
        UUID id PK
        UUID host_id FK
        TEXT slug
        TEXT type
        TEXT status
        TEXT booking_mode
        TEXT payment_policy
        TEXT cancellation_policy
        TEXT channex_property_id
        BOOLEAN pet_friendly
        GEOGRAPHY location
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    property_translations {
        UUID id PK
        UUID property_id FK
        TEXT locale
        TEXT name
        TEXT description
        TEXT address
        TEXT city
        TEXT province
    }

    property_photos {
        UUID id PK
        UUID property_id FK
        TEXT storage_path
        TEXT url
        TEXT thumbnail_url
        INT sort_order
        TEXT alt_text
    }

    amenities {
        UUID id PK
        TEXT slug
        TEXT icon
    }

    amenity_translations {
        UUID id PK
        UUID amenity_id FK
        TEXT locale
        TEXT name
    }

    property_amenities {
        UUID property_id PK,FK
        UUID amenity_id PK,FK
    }

    room_types {
        UUID id PK
        UUID property_id FK
        INT total_units
        INT max_guests
        INT bedrooms
        INT bathrooms
        INT min_stay_nights
        INT max_stay_nights
        INT sort_order
        TIMESTAMPTZ created_at
    }

    room_type_translations {
        UUID id PK
        UUID room_type_id FK
        TEXT locale
        TEXT name
        TEXT description
    }

    room_type_photos {
        UUID id PK
        UUID room_type_id FK
        TEXT storage_path
        TEXT url
        TEXT thumbnail_url
        INT sort_order
    }

    room_type_pricing {
        UUID id PK
        UUID room_type_id FK
        DECIMAL nightly_rate
        DECIMAL weekly_discount
        DECIMAL monthly_discount
        DECIMAL deposit_percentage
        TEXT currency
    }

    seasonal_pricing {
        UUID id PK
        UUID room_type_id FK
        TEXT name
        DATE start_date
        DATE end_date
        DECIMAL nightly_rate
    }

    pricing_suggestions {
        UUID id PK
        UUID property_id FK
        DECIMAL suggested_rate
        TEXT reason
        DATE date_range_start
        DATE date_range_end
        TEXT status
        TIMESTAMPTZ created_at
    }

    availability {
        UUID id PK
        UUID room_type_id FK
        DATE date
        INT available_count
        TEXT status
        TEXT source
    }

    promotions {
        UUID id PK
        TEXT code "unique"
        TEXT discount_type "percentage | fixed_amount"
        DECIMAL discount_value
        TEXT sponsor
        JSONB conditions "min_nights, min_amount, applicable_types, etc."
        TIMESTAMPTZ valid_from
        TIMESTAMPTZ valid_until
        INT max_uses "null = unlimited"
        INT used_count
        UUID property_id FK "null = platform-wide"
        BOOLEAN is_active
        UUID created_by FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    bookings {
        UUID id PK
        UUID property_id FK
        UUID room_type_id FK
        UUID guest_id FK
        UUID promotion_id FK "null = no promo"
        JSONB applied_promotion "snapshot of promo terms at booking time"
        DATE check_in
        DATE check_out
        INT guests_count
        INT rooms_count
        TEXT status
        TEXT booking_mode
        TEXT cancellation_policy
        TEXT payment_policy
        DECIMAL total_amount
        DECIMAL discount_amount
        DECIMAL deposit_amount
        TEXT currency
        TEXT special_requests
        TIMESTAMPTZ approved_at
        TIMESTAMPTZ cancelled_at
        TEXT cancellation_reason
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    transactions {
        UUID id PK
        UUID booking_id FK
        TEXT provider
        TEXT provider_tx_id
        TEXT provider_event_id
        TEXT type
        DECIMAL amount
        TEXT currency
        TEXT status
        TEXT idempotency_key
        JSONB metadata
        TIMESTAMPTZ created_at
    }

    payment_schedule {
        UUID id PK
        UUID booking_id FK
        DATE due_date
        DECIMAL amount
        TEXT status
        UUID transaction_id FK
        TIMESTAMPTZ created_at
    }

    payouts {
        UUID id PK
        UUID host_id FK
        UUID booking_id FK
        DECIMAL gross_amount
        DECIMAL commission_amount
        DECIMAL net_amount
        TEXT currency
        TEXT status
        TIMESTAMPTZ hold_until
        TIMESTAMPTZ processed_at
        TIMESTAMPTZ created_at
    }

    reviews {
        UUID id PK
        UUID booking_id FK "unique - one review per booking"
        UUID reviewer_id FK
        UUID property_id FK
        INT rating "1-5"
        TEXT comment
        TEXT host_reply
        TIMESTAMPTZ host_replied_at
        BOOLEAN is_visible "admin moderation flag"
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    conversations {
        UUID id PK
        UUID property_id FK
        UUID guest_id FK
        UUID host_id FK
        UUID booking_id FK "null = pre-booking inquiry"
        TIMESTAMPTZ last_message_at
        TIMESTAMPTZ created_at
    }

    messages {
        UUID id PK
        UUID conversation_id FK
        UUID sender_id FK
        TEXT message_body
        TEXT message_type "text | image | system"
        TIMESTAMPTZ read_at "null = unread"
        TIMESTAMPTZ sent_at
    }

    audit_log {
        UUID id PK
        TEXT entity_type
        UUID entity_id
        TEXT action
        JSONB old_value
        JSONB new_value
        UUID performed_by FK
        TIMESTAMPTZ created_at
    }

    %% Auth & User relationships
    users ||--o{ user_roles : "has"
    users ||--o| host_profiles : "upgrades to"

    %% Host → Property
    host_profiles ||--o{ properties : "lists"

    %% Property relationships
    properties ||--o{ property_translations : "has"
    properties ||--o{ property_photos : "has"
    properties ||--o{ property_amenities : "has"
    properties ||--o{ room_types : "contains"
    properties ||--o{ pricing_suggestions : "receives"

    %% Amenity relationships
    amenities ||--o{ amenity_translations : "has"
    amenities ||--o{ property_amenities : "linked via"

    %% Room type relationships
    room_types ||--o{ room_type_translations : "has"
    room_types ||--o{ room_type_photos : "has"
    room_types ||--o| room_type_pricing : "has"
    room_types ||--o{ seasonal_pricing : "has"
    room_types ||--o{ availability : "tracks"

    %% Promotions
    promotions ||--o{ bookings : "applied to"
    properties ||--o{ promotions : "has"
    users ||--o{ promotions : "creates"

    %% Booking relationships
    users ||--o{ bookings : "makes"
    properties ||--o{ bookings : "receives"
    room_types ||--o{ bookings : "booked as"

    %% Payment relationships
    bookings ||--o{ transactions : "generates"
    bookings ||--o{ payment_schedule : "has"
    bookings ||--o{ payouts : "triggers"
    transactions ||--o{ payment_schedule : "fulfils"
    host_profiles ||--o{ payouts : "receives"

    %% Reviews
    bookings ||--o| reviews : "results in 1 review"
    users ||--o{ reviews : "writes"
    properties ||--o{ reviews : "receives"

    %% Messaging
    properties ||--o{ conversations : "has"
    users ||--o{ conversations : "guest in"
    users ||--o{ conversations : "host in"
    bookings ||--o| conversations : "linked to"
    conversations ||--o{ messages : "contains"
    users ||--o{ messages : "sends"

    %% Audit
    users ||--o{ audit_log : "performs"
