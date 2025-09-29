-- SAFE POLICIES FOR SUBSCRIPTION & BILLING AND SETTINGS & SECURITY
-- This file safely creates all policies without conflicts

-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from subscription & billing tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('billing_plans', 'billing_invoices', 'payment_methods', 'usage_tracking', 'billing_addresses', 'discount_codes', 'applied_discounts')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
    
    -- Drop all policies from settings & security tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('user_settings', 'company_settings', 'security_audit_logs', 'api_keys', 'two_factor_auth', 'user_sessions', 'data_export_requests', 'webhook_endpoints', 'webhook_delivery_logs')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- SUBSCRIPTION & BILLING POLICIES
-- Billing Plans Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_plans') THEN
        CREATE POLICY "Anyone can view billing plans" ON billing_plans FOR SELECT USING (true);
    END IF;
END $$;

-- Billing Invoices Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_invoices') THEN
        CREATE POLICY "Users can view their company invoices" ON billing_invoices FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert invoices for their company" ON billing_invoices FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company invoices" ON billing_invoices FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Payment Methods Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
        CREATE POLICY "Users can view their company payment methods" ON payment_methods FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert payment methods for their company" ON payment_methods FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company payment methods" ON payment_methods FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can delete their company payment methods" ON payment_methods FOR DELETE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Usage Tracking Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
        CREATE POLICY "Users can view their company usage" ON usage_tracking FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert usage for their company" ON usage_tracking FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company usage" ON usage_tracking FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Billing Addresses Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_addresses') THEN
        CREATE POLICY "Users can view their company billing addresses" ON billing_addresses FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert billing addresses for their company" ON billing_addresses FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company billing addresses" ON billing_addresses FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can delete their company billing addresses" ON billing_addresses FOR DELETE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Discount Codes Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_codes') THEN
        CREATE POLICY "Anyone can view active discount codes" ON discount_codes FOR SELECT USING (
            is_active = true AND (valid_until IS NULL OR valid_until > NOW())
        );
    END IF;
END $$;

-- Applied Discounts Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applied_discounts') THEN
        CREATE POLICY "Users can view their company applied discounts" ON applied_discounts FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert applied discounts for their company" ON applied_discounts FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company applied discounts" ON applied_discounts FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- SETTINGS & SECURITY POLICIES
-- User Settings Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        CREATE POLICY "Users can view their own settings" ON user_settings FOR SELECT USING (user_id = auth.uid());
        CREATE POLICY "Users can insert their own settings" ON user_settings FOR INSERT WITH CHECK (user_id = auth.uid());
        CREATE POLICY "Users can update their own settings" ON user_settings FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "Users can delete their own settings" ON user_settings FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- Company Settings Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_settings') THEN
        CREATE POLICY "Users can view their company settings" ON company_settings FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Admins can insert company settings" ON company_settings FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin')
        );
        
        CREATE POLICY "Admins can update company settings" ON company_settings FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- Security Audit Logs Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_logs') THEN
        CREATE POLICY "Users can view their company audit logs" ON security_audit_logs FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "System can insert audit logs" ON security_audit_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- API Keys Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        CREATE POLICY "Users can view their company API keys" ON api_keys FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert API keys for their company" ON api_keys FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company API keys" ON api_keys FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can delete their company API keys" ON api_keys FOR DELETE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Two-Factor Authentication Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'two_factor_auth') THEN
        CREATE POLICY "Users can view their own 2FA settings" ON two_factor_auth FOR SELECT USING (user_id = auth.uid());
        CREATE POLICY "Users can insert their own 2FA settings" ON two_factor_auth FOR INSERT WITH CHECK (user_id = auth.uid());
        CREATE POLICY "Users can update their own 2FA settings" ON two_factor_auth FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "Users can delete their own 2FA settings" ON two_factor_auth FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- User Sessions Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        CREATE POLICY "Users can view their own sessions" ON user_sessions FOR SELECT USING (user_id = auth.uid());
        CREATE POLICY "System can insert sessions" ON user_sessions FOR INSERT WITH CHECK (true);
        CREATE POLICY "Users can update their own sessions" ON user_sessions FOR UPDATE USING (user_id = auth.uid());
        CREATE POLICY "Users can delete their own sessions" ON user_sessions FOR DELETE USING (user_id = auth.uid());
    END IF;
END $$;

-- Data Export Requests Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_export_requests') THEN
        CREATE POLICY "Users can view their company export requests" ON data_export_requests FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert export requests for their company" ON data_export_requests FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company export requests" ON data_export_requests FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Webhook Endpoints Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_endpoints') THEN
        CREATE POLICY "Users can view their company webhooks" ON webhook_endpoints FOR SELECT USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can insert webhooks for their company" ON webhook_endpoints FOR INSERT WITH CHECK (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can update their company webhooks" ON webhook_endpoints FOR UPDATE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
        
        CREATE POLICY "Users can delete their company webhooks" ON webhook_endpoints FOR DELETE USING (
            company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
        );
    END IF;
END $$;

-- Webhook Delivery Logs Policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_delivery_logs') THEN
        CREATE POLICY "Users can view their company webhook logs" ON webhook_delivery_logs FOR SELECT USING (
            webhook_id IN (
                SELECT id FROM webhook_endpoints 
                WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
            )
        );
        
        CREATE POLICY "System can insert webhook logs" ON webhook_delivery_logs FOR INSERT WITH CHECK (true);
    END IF;
END $$;
