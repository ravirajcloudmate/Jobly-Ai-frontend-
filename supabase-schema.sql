-- AI Interview Management System - Complete Database Schema
-- Paste this entire script into Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'hr_manager', 'recruiter', 'viewer');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship');
CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed');
CREATE TYPE candidate_status AS ENUM ('applied', 'screening', 'interview_scheduled', 'interviewed', 'hired', 'rejected');
CREATE TYPE interview_type AS ENUM ('ai', 'human', 'hybrid');
CREATE TYPE interview_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE recommendation_type AS ENUM ('hire', 'maybe', 'no_hire');
CREATE TYPE plan_type AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');

-- =============================================
-- COMPANIES TABLE
-- =============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    industry VARCHAR(100),
    size VARCHAR(50),
    description TEXT,
    settings JSONB DEFAULT '{
        "branding": {
            "primary_color": "#3B82F6",
            "secondary_color": "#6366F1"
        },
        "interview_settings": {
            "default_duration": 30,
            "recording_enabled": true,
            "ai_analysis_enabled": true
        },
        "notifications": {
            "email_enabled": true
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USERS TABLE (extends Supabase auth.users)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role user_role DEFAULT 'viewer',
    permissions TEXT[] DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- JOBS TABLE
-- =============================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    location VARCHAR(255) NOT NULL,
    employment_type employment_type DEFAULT 'full_time',
    salary_range JSONB, -- {min: number, max: number, currency: string}
    status job_status DEFAULT 'draft',
    ai_interview_config JSONB DEFAULT '{
        "questions": [],
        "evaluation_criteria": [],
        "duration_minutes": 30
    }'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CANDIDATES TABLE
-- =============================================
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    resume_url TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    status candidate_status DEFAULT 'applied',
    source VARCHAR(50) DEFAULT 'direct',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite index for efficient queries
    UNIQUE(job_id, email)
);

-- =============================================
-- INTERVIEWS TABLE
-- =============================================
CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type interview_type DEFAULT 'ai',
    status interview_status DEFAULT 'scheduled',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    meeting_url TEXT,
    recording_url TEXT,
    transcript TEXT,
    ai_questions JSONB DEFAULT '[]'::jsonb,
    ai_responses JSONB DEFAULT '[]'::jsonb,
    technical_assessment JSONB, -- {questions: [], responses: [], score: number}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INTERVIEW REPORTS TABLE
-- =============================================
CREATE TABLE interview_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    overall_score DECIMAL(3,1) CHECK (overall_score >= 0 AND overall_score <= 10),
    technical_score DECIMAL(3,1) CHECK (technical_score >= 0 AND technical_score <= 10),
    communication_score DECIMAL(3,1) CHECK (communication_score >= 0 AND communication_score <= 10),
    cultural_fit_score DECIMAL(3,1) CHECK (cultural_fit_score >= 0 AND cultural_fit_score <= 10),
    ai_analysis JSONB DEFAULT '{
        "strengths": [],
        "weaknesses": [],
        "recommendations": [],
        "confidence_level": 0
    }'::jsonb,
    human_feedback TEXT,
    recommendation recommendation_type,
    generated_by VARCHAR(20) DEFAULT 'ai',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one report per interview
    UNIQUE(interview_id)
);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
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

-- =============================================
-- ANALYTICS EVENTS TABLE
-- =============================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SETTINGS TABLE (Company-specific settings)
-- =============================================
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'security', 'notifications', 'integrations', etc.
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, category)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Jobs indexes
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- Candidates indexes
CREATE INDEX idx_candidates_job_id ON candidates(job_id);
CREATE INDEX idx_candidates_company_id ON candidates(company_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_created_at ON candidates(created_at DESC);

-- Interviews indexes
CREATE INDEX idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX idx_interviews_job_id ON interviews(job_id);
CREATE INDEX idx_interviews_company_id ON interviews(company_id);
CREATE INDEX idx_interviews_status ON interviews(status);
CREATE INDEX idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX idx_interviews_created_at ON interviews(created_at DESC);

-- Interview reports indexes
CREATE INDEX idx_reports_company_id ON interview_reports(company_id);
CREATE INDEX idx_reports_job_id ON interview_reports(job_id);
CREATE INDEX idx_reports_recommendation ON interview_reports(recommendation);
CREATE INDEX idx_reports_overall_score ON interview_reports(overall_score DESC);

-- Analytics indexes
CREATE INDEX idx_analytics_company_id ON analytics_events(company_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can update their company" ON companies
    FOR UPDATE USING (id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Users policies
CREATE POLICY "Users can view company members" ON users
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage company users" ON users
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager')
    ));

-- Jobs policies
CREATE POLICY "Company members can view jobs" ON jobs
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "HR roles can manage jobs" ON jobs
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Candidates policies
CREATE POLICY "Company members can view candidates" ON candidates
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "HR roles can manage candidates" ON candidates
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Interviews policies
CREATE POLICY "Company members can view interviews" ON interviews
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "HR roles can manage interviews" ON interviews
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Interview reports policies
CREATE POLICY "Company members can view reports" ON interview_reports
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "HR roles can manage reports" ON interview_reports
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Subscriptions policies
CREATE POLICY "Company members can view subscription" ON subscriptions
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage subscription" ON subscriptions
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Analytics policies
CREATE POLICY "Company members can view analytics" ON analytics_events
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "System can insert analytics" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- Company settings policies
CREATE POLICY "Company members can view settings" ON company_settings
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage settings" ON company_settings
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
    BEFORE UPDATE ON candidates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at 
    BEFORE UPDATE ON interviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_reports_updated_at 
    BEFORE UPDATE ON interview_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at 
    BEFORE UPDATE ON company_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get company analytics
CREATE OR REPLACE FUNCTION get_company_analytics(company_uuid UUID, start_date DATE, end_date DATE)
RETURNS TABLE(
    total_interviews INTEGER,
    completed_interviews INTEGER,
    average_score DECIMAL,
    hire_rate DECIMAL,
    top_performing_jobs JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(i.id)::INTEGER as total_interviews,
        COUNT(CASE WHEN i.status = 'completed' THEN 1 END)::INTEGER as completed_interviews,
        COALESCE(AVG(ir.overall_score), 0) as average_score,
        COALESCE(
            COUNT(CASE WHEN ir.recommendation = 'hire' THEN 1 END)::DECIMAL / 
            NULLIF(COUNT(CASE WHEN i.status = 'completed' THEN 1 END), 0) * 100, 
            0
        ) as hire_rate,
        COALESCE(
            json_agg(
                json_build_object(
                    'job_title', j.title,
                    'interviews', COUNT(i.id),
                    'avg_score', AVG(ir.overall_score)
                )
            ) FILTER (WHERE j.id IS NOT NULL),
            '[]'::json
        ) as top_performing_jobs
    FROM interviews i
    LEFT JOIN interview_reports ir ON i.id = ir.interview_id
    LEFT JOIN jobs j ON i.job_id = j.id
    WHERE i.company_id = company_uuid
    AND i.created_at::DATE BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample company
INSERT INTO companies (id, name, domain, industry, size) VALUES 
('00000000-0000-0000-0000-000000000001', 'TechCorp Inc', 'techcorp.com', 'Technology', '50-200');

-- Insert sample subscription
INSERT INTO subscriptions (
    company_id, 
    plan_type, 
    status, 
    current_period_start, 
    current_period_end
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'professional',
    'active',
    NOW(),
    NOW() + INTERVAL '1 month'
);

-- Note: Users will be created automatically via the trigger when they sign up through Supabase Auth

COMMIT;
