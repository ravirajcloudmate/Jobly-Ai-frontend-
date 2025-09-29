-- SUBSCRIPTIONS TABLE
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_type plan_type DEFAULT 'starter',
    status subscription_status DEFAULT 'trialing',
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    usage_limits JSONB DEFAULT '{
        "interviews_per_month": 50,
        "users": 5,
        "storage_gb": 10
    }'::jsonb,
    usage_current JSONB DEFAULT '{
        "interviews_this_month": 0,
        "active_users": 0,
        "storage_used_gb": 0
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One active subscription per company
    UNIQUE(company_id)
);
