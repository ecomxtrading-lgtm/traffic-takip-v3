-- Universal Tracking - RLS Policies
-- Row Level Security for multi-tenant isolation

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

-- Create function to get current site_id from JWT
CREATE OR REPLACE FUNCTION get_current_site_id()
RETURNS UUID AS $$
BEGIN
    -- Extract site_id from JWT claim
    -- This will be set by the application when establishing connection
    RETURN COALESCE(
        current_setting('app.current_site_id', true)::UUID,
        NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current customer_id from site_id
CREATE OR REPLACE FUNCTION get_current_customer_id()
RETURNS UUID AS $$
DECLARE
    customer_uuid UUID;
BEGIN
    -- Get customer_id from current site_id
    SELECT customer_id INTO customer_uuid
    FROM sites
    WHERE id = get_current_site_id();
    
    RETURN customer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Customers RLS Policy
-- Customers can only see their own data
CREATE POLICY customers_own_data ON customers
    FOR ALL
    USING (id = get_current_customer_id());

-- Sites RLS Policy  
-- Sites can only see their own data and their customer's sites
CREATE POLICY sites_own_data ON sites
    FOR ALL
    USING (customer_id = get_current_customer_id());

-- Subscriptions RLS Policy
-- Subscriptions can only see their own data and their customer's subscriptions
CREATE POLICY subscriptions_own_data ON subscriptions
    FOR ALL
    USING (customer_id = get_current_customer_id());

-- Dashboard Settings RLS Policy
-- Dashboard settings can only be accessed by the site owner
CREATE POLICY dashboard_settings_own_data ON dashboard_settings
    FOR ALL
    USING (site_id = get_current_site_id());

-- Ad Accounts RLS Policy
-- Ad accounts can only be accessed by the site owner
CREATE POLICY ad_accounts_own_data ON ad_accounts
    FOR ALL
    USING (site_id = get_current_site_id());

-- Create function to set current site_id (called by application)
CREATE OR REPLACE FUNCTION set_current_site_id(site_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Verify site exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM sites 
        WHERE id = site_uuid 
        AND status = 'active'
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Invalid or inactive site_id: %', site_uuid;
    END IF;
    
    -- Set the site_id for this session
    PERFORM set_config('app.current_site_id', site_uuid::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear current site_id (for logout)
CREATE OR REPLACE FUNCTION clear_current_site_id()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_site_id', NULL, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;
