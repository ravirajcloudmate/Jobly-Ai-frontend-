-- SETTINGS & SECURITY POLICIES
-- Row Level Security policies for settings and security tables

-- Enable RLS on all tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- User Settings Policies
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (user_id = auth.uid());

-- Company Settings Policies
CREATE POLICY "Users can view their company settings" ON company_settings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert company settings" ON company_settings
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update company settings" ON company_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Security Audit Logs Policies
CREATE POLICY "Users can view their company audit logs" ON security_audit_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can insert audit logs" ON security_audit_logs
    FOR INSERT WITH CHECK (true); -- Allow system to insert logs

-- API Keys Policies
CREATE POLICY "Users can view their company API keys" ON api_keys
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert API keys for their company" ON api_keys
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company API keys" ON api_keys
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their company API keys" ON api_keys
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Two-Factor Authentication Policies
CREATE POLICY "Users can view their own 2FA settings" ON two_factor_auth
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own 2FA settings" ON two_factor_auth
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own 2FA settings" ON two_factor_auth
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own 2FA settings" ON two_factor_auth
    FOR DELETE USING (user_id = auth.uid());

-- User Sessions Policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert sessions" ON user_sessions
    FOR INSERT WITH CHECK (true); -- Allow system to create sessions

CREATE POLICY "Users can update their own sessions" ON user_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions" ON user_sessions
    FOR DELETE USING (user_id = auth.uid());

-- Data Export Requests Policies
CREATE POLICY "Users can view their company export requests" ON data_export_requests
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert export requests for their company" ON data_export_requests
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company export requests" ON data_export_requests
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Webhook Endpoints Policies
CREATE POLICY "Users can view their company webhooks" ON webhook_endpoints
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert webhooks for their company" ON webhook_endpoints
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company webhooks" ON webhook_endpoints
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their company webhooks" ON webhook_endpoints
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Webhook Delivery Logs Policies
CREATE POLICY "Users can view their company webhook logs" ON webhook_delivery_logs
    FOR SELECT USING (
        webhook_id IN (
            SELECT id FROM webhook_endpoints 
            WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "System can insert webhook logs" ON webhook_delivery_logs
    FOR INSERT WITH CHECK (true); -- Allow system to insert logs

-- Create functions for settings management
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID)
RETURNS TABLE (
    preferences JSONB,
    privacy_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.preferences,
        us.privacy_settings
    FROM user_settings us
    WHERE us.user_id = p_user_id
    AND us.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_company_settings(p_company_id UUID)
RETURNS TABLE (
    general_settings JSONB,
    security_settings JSONB,
    notification_settings JSONB,
    integration_settings JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.general_settings,
        cs.security_settings,
        cs.notification_settings,
        cs.integration_settings
    FROM company_settings cs
    WHERE cs.company_id = p_company_id
    AND cs.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_security_audit_logs(
    p_company_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    event_type VARCHAR(50),
    event_category VARCHAR(30),
    severity VARCHAR(10),
    description TEXT,
    ip_address INET,
    success BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sal.id,
        sal.user_id,
        sal.event_type,
        sal.event_category,
        sal.severity,
        sal.description,
        sal.ip_address,
        sal.success,
        sal.created_at
    FROM security_audit_logs sal
    WHERE sal.company_id = p_company_id
    AND sal.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
    ORDER BY sal.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_sessions(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    is_active BOOLEAN,
    last_activity TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.id,
        us.ip_address,
        us.user_agent,
        us.device_info,
        us.is_active,
        us.last_activity,
        us.expires_at,
        us.created_at
    FROM user_sessions us
    WHERE us.user_id = p_user_id
    AND us.user_id = auth.uid()
    ORDER BY us.last_activity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_company_api_keys(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    key_prefix VARCHAR(20),
    permissions JSONB,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ak.id,
        ak.name,
        ak.key_prefix,
        ak.permissions,
        ak.last_used_at,
        ak.expires_at,
        ak.is_active,
        ak.created_at
    FROM api_keys ak
    WHERE ak.company_id = p_company_id
    AND ak.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
    ORDER BY ak.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_company_webhooks(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(100),
    url VARCHAR(500),
    events TEXT[],
    is_active BOOLEAN,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        we.id,
        we.name,
        we.url,
        we.events,
        we.is_active,
        we.last_triggered_at,
        we.failure_count,
        we.created_at
    FROM webhook_endpoints we
    WHERE we.company_id = p_company_id
    AND we.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
    ORDER BY we.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
