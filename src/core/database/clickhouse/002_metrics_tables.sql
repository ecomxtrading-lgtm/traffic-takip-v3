-- Universal Tracking - ClickHouse Metrics Tables
-- Aggregated metrics for hourly and daily reporting

-- Hourly metrics table
CREATE TABLE IF NOT EXISTS metrics_hourly (
    -- Dimensions
    site_id String,
    date Date,
    hour UInt8,
    
    -- Event metrics
    total_events UInt64,
    unique_sessions UInt64,
    unique_users UInt64,
    
    -- Page view metrics
    page_views UInt64,
    unique_page_views UInt64,
    
    -- E-commerce metrics
    purchases UInt64,
    purchase_revenue Decimal64(2),
    add_to_cart_events UInt64,
    cart_abandonment_rate Float32,
    
    -- Engagement metrics
    avg_session_duration Float32, -- in seconds
    bounce_rate Float32,
    
    -- Traffic sources
    organic_traffic UInt64,
    paid_traffic UInt64,
    direct_traffic UInt64,
    referral_traffic UInt64,
    social_traffic UInt64,
    
    -- Device breakdown
    desktop_events UInt64,
    mobile_events UInt64,
    tablet_events UInt64,
    
    -- Geographic breakdown (top countries)
    top_countries Map(String, UInt64),
    
    -- Technical fields
    created_at DateTime64(3) DEFAULT now64(3),
    updated_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = SummingMergeTree()
PARTITION BY (site_id, date)
ORDER BY (site_id, date, hour)
TTL created_at + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- Daily metrics table (aggregated from hourly)
CREATE TABLE IF NOT EXISTS metrics_daily (
    -- Dimensions
    site_id String,
    date Date,
    
    -- Event metrics
    total_events UInt64,
    unique_sessions UInt64,
    unique_users UInt64,
    
    -- Page view metrics
    page_views UInt64,
    unique_page_views UInt64,
    
    -- E-commerce metrics
    purchases UInt64,
    purchase_revenue Decimal64(2),
    add_to_cart_events UInt64,
    cart_abandonment_rate Float32,
    conversion_rate Float32,
    
    -- Engagement metrics
    avg_session_duration Float32, -- in seconds
    bounce_rate Float32,
    pages_per_session Float32,
    
    -- Traffic sources
    organic_traffic UInt64,
    paid_traffic UInt64,
    direct_traffic UInt64,
    referral_traffic UInt64,
    social_traffic UInt64,
    
    -- Device breakdown
    desktop_events UInt64,
    mobile_events UInt64,
    tablet_events UInt64,
    
    -- Geographic breakdown (top countries)
    top_countries Map(String, UInt64),
    
    -- Technical fields
    created_at DateTime64(3) DEFAULT now64(3),
    updated_at DateTime64(3) DEFAULT now64(3)
)
ENGINE = SummingMergeTree()
PARTITION BY (site_id, date)
ORDER BY (site_id, date)
TTL created_at + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- Create materialized view to aggregate hourly metrics from events
CREATE MATERIALIZED VIEW IF NOT EXISTS events_to_hourly_metrics
TO metrics_hourly
AS SELECT
    site_id,
    date,
    hour,
    count() as total_events,
    uniq(session_id) as unique_sessions,
    uniq(user_id) as unique_users,
    countIf(event_name = 'page_view') as page_views,
    uniqIf(page_url, event_name = 'page_view') as unique_page_views,
    countIf(event_name = 'purchase') as purchases,
    sumIf(value, event_name = 'purchase') as purchase_revenue,
    countIf(event_name = 'add_to_cart') as add_to_cart_events,
    countIf(event_name = 'add_to_cart') / nullIf(countIf(event_name = 'add_to_cart') + countIf(event_name = 'purchase'), 0) as cart_abandonment_rate,
    avgIf(timestamp - toStartOfHour(timestamp), event_name = 'page_view') as avg_session_duration,
    countIf(event_name = 'page_view' AND session_id IN (
        SELECT session_id FROM events 
        WHERE site_id = events.site_id 
        AND date = events.date 
        AND hour = events.hour
        GROUP BY session_id 
        HAVING count() = 1
    )) / nullIf(countIf(event_name = 'page_view'), 0) as bounce_rate,
    countIf(utm_source = 'google' AND utm_medium = 'organic') as organic_traffic,
    countIf(utm_medium IN ('cpc', 'paid', 'ppc')) as paid_traffic,
    countIf(referrer = '' OR referrer IS NULL) as direct_traffic,
    countIf(referrer != '' AND referrer NOT LIKE '%google%' AND referrer NOT LIKE '%facebook%') as referral_traffic,
    countIf(referrer LIKE '%facebook%' OR referrer LIKE '%twitter%' OR referrer LIKE '%instagram%') as social_traffic,
    countIf(device_type = 'desktop') as desktop_events,
    countIf(device_type = 'mobile') as mobile_events,
    countIf(device_type = 'tablet') as tablet_events,
    topK(5)(country) as top_countries
FROM events
WHERE timestamp >= toStartOfHour(now()) - INTERVAL 1 HOUR
GROUP BY site_id, date, hour;

-- Create materialized view to aggregate daily metrics from hourly
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_to_daily_metrics
TO metrics_daily
AS SELECT
    site_id,
    date,
    sum(total_events) as total_events,
    sum(unique_sessions) as unique_sessions,
    sum(unique_users) as unique_users,
    sum(page_views) as page_views,
    sum(unique_page_views) as unique_page_views,
    sum(purchases) as purchases,
    sum(purchase_revenue) as purchase_revenue,
    sum(add_to_cart_events) as add_to_cart_events,
    avg(cart_abandonment_rate) as cart_abandonment_rate,
    sum(purchases) / nullIf(sum(unique_sessions), 0) as conversion_rate,
    avg(avg_session_duration) as avg_session_duration,
    avg(bounce_rate) as bounce_rate,
    sum(page_views) / nullIf(sum(unique_sessions), 0) as pages_per_session,
    sum(organic_traffic) as organic_traffic,
    sum(paid_traffic) as paid_traffic,
    sum(direct_traffic) as direct_traffic,
    sum(referral_traffic) as referral_traffic,
    sum(social_traffic) as social_traffic,
    sum(desktop_events) as desktop_events,
    sum(mobile_events) as mobile_events,
    sum(tablet_events) as tablet_events,
    topK(5)(top_countries) as top_countries
FROM metrics_hourly
WHERE date = today() - 1
GROUP BY site_id, date;
