-- Universal Tracking - ClickHouse Events Table
-- Main events table for tracking analytics data

CREATE TABLE IF NOT EXISTS events (
    -- Event identification
    event_id String,
    site_id String,
    session_id String,
    user_id Nullable(String),
    
    -- Event details
    event_name String,
    event_type String, -- 'page_view', 'click', 'purchase', 'add_to_cart', etc.
    event_category String, -- 'ecommerce', 'engagement', 'conversion', etc.
    
    -- Timestamps
    timestamp DateTime64(3),
    date Date MATERIALIZED toDate(timestamp),
    hour UInt8 MATERIALIZED toHour(timestamp),
    
    -- Page/URL information
    page_url String,
    page_title Nullable(String),
    referrer Nullable(String),
    utm_source Nullable(String),
    utm_medium Nullable(String),
    utm_campaign Nullable(String),
    utm_term Nullable(String),
    utm_content Nullable(String),
    
    -- User information
    user_agent String,
    ip_address String,
    country String DEFAULT '',
    city String DEFAULT '',
    region String DEFAULT '',
    
    -- Device information
    device_type String, -- 'desktop', 'mobile', 'tablet'
    browser String,
    browser_version String,
    os String,
    os_version String,
    
    -- E-commerce specific
    currency Nullable(String),
    value Nullable(Decimal64(2)),
    product_id Nullable(String),
    product_name Nullable(String),
    product_category Nullable(String),
    product_sku Nullable(String),
    product_price Nullable(Decimal64(2)),
    product_quantity Nullable(UInt32),
    
    -- Custom properties
    properties Map(String, String),
    
    -- Technical fields
    created_at DateTime64(3) DEFAULT now64(3),
    version UInt8 DEFAULT 1
)
ENGINE = MergeTree()
PARTITION BY (site_id, date)
ORDER BY (site_id, timestamp, event_id)
TTL timestamp + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events (site_id, session_id) TYPE minmax GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events (site_id, user_id) TYPE minmax GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_events_event_name ON events (site_id, event_name) TYPE set(0) GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_events_product_id ON events (site_id, product_id) TYPE minmax GRANULARITY 1;
