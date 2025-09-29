-- ANALYTICS & INSIGHTS RLS POLICIES
-- Row Level Security policies for analytics tables

-- Enable RLS on analytics tables
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Analytics Metrics Policies
DROP POLICY IF EXISTS "Company members can view analytics metrics" ON analytics_metrics;
CREATE POLICY "Company members can view analytics metrics" ON analytics_metrics
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert analytics metrics" ON analytics_metrics;
CREATE POLICY "System can insert analytics metrics" ON analytics_metrics
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update analytics metrics" ON analytics_metrics;
CREATE POLICY "System can update analytics metrics" ON analytics_metrics
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "System can delete analytics metrics" ON analytics_metrics;
CREATE POLICY "System can delete analytics metrics" ON analytics_metrics
    FOR DELETE USING (true);

-- Analytics Events Policies
DROP POLICY IF EXISTS "Company members can view analytics events" ON analytics_events;
CREATE POLICY "Company members can view analytics events" ON analytics_events
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON analytics_events;
CREATE POLICY "Authenticated users can insert analytics events" ON analytics_events
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can update analytics events" ON analytics_events;
CREATE POLICY "System can update analytics events" ON analytics_events
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "System can delete analytics events" ON analytics_events;
CREATE POLICY "System can delete analytics events" ON analytics_events
    FOR DELETE USING (true);

-- Analytics Trends Policies
DROP POLICY IF EXISTS "Company members can view analytics trends" ON analytics_trends;
CREATE POLICY "Company members can view analytics trends" ON analytics_trends
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert analytics trends" ON analytics_trends;
CREATE POLICY "System can insert analytics trends" ON analytics_trends
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update analytics trends" ON analytics_trends;
CREATE POLICY "System can update analytics trends" ON analytics_trends
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "System can delete analytics trends" ON analytics_trends;
CREATE POLICY "System can delete analytics trends" ON analytics_trends
    FOR DELETE USING (true);

-- Analytics Insights Policies
DROP POLICY IF EXISTS "Company members can view analytics insights" ON analytics_insights;
CREATE POLICY "Company members can view analytics insights" ON analytics_insights
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Company admins can insert analytics insights" ON analytics_insights;
CREATE POLICY "Company admins can insert analytics insights" ON analytics_insights
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Company members can update analytics insights" ON analytics_insights;
CREATE POLICY "Company members can update analytics insights" ON analytics_insights
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Company admins can delete analytics insights" ON analytics_insights;
CREATE POLICY "Company admins can delete analytics insights" ON analytics_insights
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Analytics Dashboard Settings Policies
DROP POLICY IF EXISTS "Users can view their dashboard settings" ON analytics_dashboard_settings;
CREATE POLICY "Users can view their dashboard settings" ON analytics_dashboard_settings
    FOR SELECT USING (
        user_id = auth.uid() OR
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their dashboard settings" ON analytics_dashboard_settings;
CREATE POLICY "Users can insert their dashboard settings" ON analytics_dashboard_settings
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their dashboard settings" ON analytics_dashboard_settings;
CREATE POLICY "Users can update their dashboard settings" ON analytics_dashboard_settings
    FOR UPDATE USING (
        user_id = auth.uid() AND
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their dashboard settings" ON analytics_dashboard_settings;
CREATE POLICY "Users can delete their dashboard settings" ON analytics_dashboard_settings
    FOR DELETE USING (
        user_id = auth.uid() AND
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT ON analytics_metrics TO authenticated;
GRANT SELECT ON analytics_events TO authenticated;
GRANT SELECT ON analytics_trends TO authenticated;
GRANT SELECT ON analytics_insights TO authenticated;
GRANT SELECT ON analytics_dashboard_settings TO authenticated;

GRANT INSERT ON analytics_events TO authenticated;
GRANT INSERT ON analytics_insights TO authenticated;
GRANT INSERT ON analytics_dashboard_settings TO authenticated;

GRANT UPDATE ON analytics_insights TO authenticated;
GRANT UPDATE ON analytics_dashboard_settings TO authenticated;

GRANT DELETE ON analytics_insights TO authenticated;
GRANT DELETE ON analytics_dashboard_settings TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_daily_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_analytics(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_trends(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION log_analytics_event(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, JSONB) TO authenticated;

