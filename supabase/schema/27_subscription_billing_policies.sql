-- SUBSCRIPTION & BILLING POLICIES
-- Row Level Security policies for subscription and billing tables

-- Enable RLS on all tables (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_plans') THEN
        ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_invoices') THEN
        ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
        ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
        ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_addresses') THEN
        ALTER TABLE billing_addresses ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_codes') THEN
        ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applied_discounts') THEN
        ALTER TABLE applied_discounts ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Billing Plans Policies (Read-only for all authenticated users)
DROP POLICY IF EXISTS "Anyone can view billing plans" ON billing_plans;
CREATE POLICY "Anyone can view billing plans" ON billing_plans
    FOR SELECT USING (true);

-- Billing Invoices Policies
CREATE POLICY "Users can view their company invoices" ON billing_invoices
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoices for their company" ON billing_invoices
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company invoices" ON billing_invoices
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Payment Methods Policies
CREATE POLICY "Users can view their company payment methods" ON payment_methods
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert payment methods for their company" ON payment_methods
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company payment methods" ON payment_methods
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their company payment methods" ON payment_methods
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Usage Tracking Policies
CREATE POLICY "Users can view their company usage" ON usage_tracking
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert usage for their company" ON usage_tracking
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company usage" ON usage_tracking
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Billing Addresses Policies
CREATE POLICY "Users can view their company billing addresses" ON billing_addresses
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert billing addresses for their company" ON billing_addresses
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company billing addresses" ON billing_addresses
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their company billing addresses" ON billing_addresses
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Discount Codes Policies (Read-only for all authenticated users)
CREATE POLICY "Anyone can view active discount codes" ON discount_codes
    FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Applied Discounts Policies
CREATE POLICY "Users can view their company applied discounts" ON applied_discounts
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert applied discounts for their company" ON applied_discounts
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their company applied discounts" ON applied_discounts
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Create functions for subscription management
CREATE OR REPLACE FUNCTION get_company_subscription(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    plan_type plan_type,
    status subscription_status,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    usage_limits JSONB,
    usage_current JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.plan_type,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.usage_limits,
        s.usage_current
    FROM subscriptions s
    WHERE s.company_id = p_company_id
    AND s.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_company_usage_stats(p_company_id UUID)
RETURNS TABLE (
    metric_name VARCHAR(50),
    current_usage DECIMAL(15,2),
    limit_value DECIMAL(15,2),
    percentage_used DECIMAL(5,2)
) AS $$
DECLARE
    usage_limits JSONB;
    usage_current JSONB;
BEGIN
    -- Get current subscription limits and usage
    SELECT s.usage_limits, s.usage_current
    INTO usage_limits, usage_current
    FROM subscriptions s
    WHERE s.company_id = p_company_id
    AND s.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    );
    
    -- Return usage statistics
    RETURN QUERY
    SELECT 
        'interviews_per_month'::VARCHAR(50) as metric_name,
        COALESCE((usage_current->>'interviews_this_month')::DECIMAL(15,2), 0) as current_usage,
        COALESCE((usage_limits->>'interviews_per_month')::DECIMAL(15,2), 0) as limit_value,
        CASE 
            WHEN COALESCE((usage_limits->>'interviews_per_month')::DECIMAL(15,2), 0) > 0 
            THEN (COALESCE((usage_current->>'interviews_this_month')::DECIMAL(15,2), 0) / (usage_limits->>'interviews_per_month')::DECIMAL(15,2)) * 100
            ELSE 0
        END as percentage_used
    
    UNION ALL
    
    SELECT 
        'users'::VARCHAR(50) as metric_name,
        COALESCE((usage_current->>'active_users')::DECIMAL(15,2), 0) as current_usage,
        COALESCE((usage_limits->>'users')::DECIMAL(15,2), 0) as limit_value,
        CASE 
            WHEN COALESCE((usage_limits->>'users')::DECIMAL(15,2), 0) > 0 
            THEN (COALESCE((usage_current->>'active_users')::DECIMAL(15,2), 0) / (usage_limits->>'users')::DECIMAL(15,2)) * 100
            ELSE 0
        END as percentage_used
    
    UNION ALL
    
    SELECT 
        'storage_gb'::VARCHAR(50) as metric_name,
        COALESCE((usage_current->>'storage_used_gb')::DECIMAL(15,2), 0) as current_usage,
        COALESCE((usage_limits->>'storage_gb')::DECIMAL(15,2), 0) as limit_value,
        CASE 
            WHEN COALESCE((usage_limits->>'storage_gb')::DECIMAL(15,2), 0) > 0 
            THEN (COALESCE((usage_current->>'storage_used_gb')::DECIMAL(15,2), 0) / (usage_limits->>'storage_gb')::DECIMAL(15,2)) * 100
            ELSE 0
        END as percentage_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_company_billing_history(p_company_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    invoice_number VARCHAR(50),
    status VARCHAR(20),
    amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    currency VARCHAR(3),
    due_date TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bi.id,
        bi.invoice_number,
        bi.status,
        bi.amount,
        bi.total_amount,
        bi.currency,
        bi.due_date,
        bi.paid_at,
        bi.billing_period_start,
        bi.billing_period_end,
        bi.created_at
    FROM billing_invoices bi
    WHERE bi.company_id = p_company_id
    AND bi.company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    )
    ORDER BY bi.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
