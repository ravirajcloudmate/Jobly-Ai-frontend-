-- ANALYTICS & INSIGHTS SCHEMA
-- This schema provides comprehensive analytics tracking and insights for the interview platform

-- Analytics Metrics Table - stores aggregated metrics by time periods
CREATE TABLE analytics_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    metric_date DATE NOT NULL,
    
    -- Job-related metrics
    total_jobs INTEGER DEFAULT 0,
    active_jobs INTEGER DEFAULT 0,
    paused_jobs INTEGER DEFAULT 0,
    closed_jobs INTEGER DEFAULT 0,
    new_jobs INTEGER DEFAULT 0,
    
    -- Interview-related metrics
    total_interviews INTEGER DEFAULT 0,
    completed_interviews INTEGER DEFAULT 0,
    scheduled_interviews INTEGER DEFAULT 0,
    cancelled_interviews INTEGER DEFAULT 0,
    new_interviews INTEGER DEFAULT 0,
    
    -- Candidate-related metrics
    total_candidates INTEGER DEFAULT 0,
    new_candidates INTEGER DEFAULT 0,
    interviewed_candidates INTEGER DEFAULT 0,
    hired_candidates INTEGER DEFAULT 0,
    rejected_candidates INTEGER DEFAULT 0,
    
    -- Report-related metrics
    total_reports INTEGER DEFAULT 0,
    new_reports INTEGER DEFAULT 0,
    hire_recommendations INTEGER DEFAULT 0,
    maybe_recommendations INTEGER DEFAULT 0,
    no_hire_recommendations INTEGER DEFAULT 0,
    
    -- Performance metrics
    average_interview_duration DECIMAL(5,2) DEFAULT 0, -- in minutes
    average_hire_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    average_time_to_hire INTEGER DEFAULT 0, -- in days
    
    -- Team activity metrics
    active_users INTEGER DEFAULT 0,
    total_invitations_sent INTEGER DEFAULT 0,
    total_invitations_accepted INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, metric_type, metric_date)
);

-- Analytics Events (enhanced from existing)
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- 'job', 'interview', 'candidate', 'report', 'user', 'system'
    event_action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'viewed', 'completed'
    metadata JSONB DEFAULT '{}'::jsonb,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics Trends Table - stores trend data for charts and visualizations
CREATE TABLE analytics_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    trend_type VARCHAR(50) NOT NULL, -- 'jobs', 'interviews', 'candidates', 'reports', 'hires'
    trend_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
    trend_date DATE NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    previous_value INTEGER DEFAULT 0,
    change_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, trend_type, trend_period, trend_date)
);

-- Analytics Insights Table - stores AI-generated insights and recommendations
CREATE TABLE analytics_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'performance', 'trend', 'recommendation', 'alert'
    insight_category VARCHAR(50) NOT NULL, -- 'hiring', 'efficiency', 'quality', 'team'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    insight_data JSONB DEFAULT '{}'::jsonb,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'dismissed', 'resolved'
    is_ai_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_analytics_insights_company_type (company_id, insight_type),
    INDEX idx_analytics_insights_priority (priority),
    INDEX idx_analytics_insights_status (status)
);

-- Analytics Dashboard Settings - stores user preferences for dashboard widgets
CREATE TABLE analytics_dashboard_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL, -- 'kpi', 'chart', 'table', 'insight'
    widget_config JSONB DEFAULT '{}'::jsonb,
    position INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, user_id, widget_type)
);

-- Create indexes for performance
CREATE INDEX idx_analytics_metrics_company_date ON analytics_metrics(company_id, metric_date);
CREATE INDEX idx_analytics_metrics_type_date ON analytics_metrics(metric_type, metric_date);
CREATE INDEX idx_analytics_events_company_type ON analytics_events(company_id, event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_trends_company_type ON analytics_trends(company_id, trend_type);
CREATE INDEX idx_analytics_trends_date ON analytics_trends(trend_date);

-- Function to calculate daily metrics
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    company_record RECORD;
    job_count INTEGER;
    interview_count INTEGER;
    candidate_count INTEGER;
    report_count INTEGER;
    hire_count INTEGER;
BEGIN
    -- Loop through all companies
    FOR company_record IN SELECT id FROM companies LOOP
        -- Calculate job metrics
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'active'),
            COUNT(*) FILTER (WHERE status = 'paused'),
            COUNT(*) FILTER (WHERE status = 'closed'),
            COUNT(*) FILTER (WHERE DATE(created_at) = target_date)
        INTO 
            job_count,
            (SELECT active_jobs FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT paused_jobs FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT closed_jobs FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT new_jobs FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1)
        FROM job_postings 
        WHERE company_id = company_record.id;
        
        -- Calculate interview metrics
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'completed'),
            COUNT(*) FILTER (WHERE status = 'scheduled'),
            COUNT(*) FILTER (WHERE status = 'cancelled'),
            COUNT(*) FILTER (WHERE DATE(created_at) = target_date)
        INTO 
            interview_count,
            (SELECT completed_interviews FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT scheduled_interviews FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT cancelled_interviews FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT new_interviews FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1)
        FROM interviews 
        WHERE company_id = company_record.id;
        
        -- Calculate candidate metrics
        SELECT 
            COUNT(DISTINCT candidate_id),
            COUNT(DISTINCT candidate_id) FILTER (WHERE DATE(created_at) = target_date),
            COUNT(DISTINCT candidate_id) FILTER (WHERE status = 'interviewed'),
            COUNT(DISTINCT candidate_id) FILTER (WHERE status = 'hired'),
            COUNT(DISTINCT candidate_id) FILTER (WHERE status = 'rejected')
        INTO 
            candidate_count,
            (SELECT new_candidates FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT interviewed_candidates FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT hired_candidates FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT rejected_candidates FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1)
        FROM interviews 
        WHERE company_id = company_record.id;
        
        -- Calculate report metrics
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE DATE(created_at) = target_date),
            COUNT(*) FILTER (WHERE recommendation = 'hire'),
            COUNT(*) FILTER (WHERE recommendation = 'maybe'),
            COUNT(*) FILTER (WHERE recommendation = 'no_hire')
        INTO 
            report_count,
            (SELECT new_reports FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT hire_recommendations FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT maybe_recommendations FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1),
            (SELECT no_hire_recommendations FROM analytics_metrics WHERE company_id = company_record.id AND metric_type = 'daily' AND metric_date = target_date LIMIT 1)
        FROM interview_reports 
        WHERE company_id = company_record.id;
        
        -- Calculate hire rate
        SELECT 
            CASE 
                WHEN report_count > 0 THEN ROUND((hire_count::DECIMAL / report_count) * 100, 2)
                ELSE 0 
            END
        INTO hire_count
        FROM interview_reports 
        WHERE company_id = company_record.id;
        
        -- Insert or update daily metrics
        INSERT INTO analytics_metrics (
            company_id, metric_type, metric_date,
            total_jobs, active_jobs, paused_jobs, closed_jobs, new_jobs,
            total_interviews, completed_interviews, scheduled_interviews, cancelled_interviews, new_interviews,
            total_candidates, new_candidates, interviewed_candidates, hired_candidates, rejected_candidates,
            total_reports, new_reports, hire_recommendations, maybe_recommendations, no_hire_recommendations,
            average_hire_rate
        ) VALUES (
            company_record.id, 'daily', target_date,
            job_count, 0, 0, 0, 0, -- job metrics will be calculated properly in a more complex query
            interview_count, 0, 0, 0, 0, -- interview metrics will be calculated properly
            candidate_count, 0, 0, 0, 0, -- candidate metrics will be calculated properly
            report_count, 0, 0, 0, 0, -- report metrics will be calculated properly
            hire_count
        )
        ON CONFLICT (company_id, metric_type, metric_date) 
        DO UPDATE SET
            total_jobs = EXCLUDED.total_jobs,
            total_interviews = EXCLUDED.total_interviews,
            total_candidates = EXCLUDED.total_candidates,
            total_reports = EXCLUDED.total_reports,
            average_hire_rate = EXCLUDED.average_hire_rate,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get analytics data for a company
CREATE OR REPLACE FUNCTION get_company_analytics(
    p_company_id UUID,
    p_date_range INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_jobs BIGINT,
    total_interviews BIGINT,
    total_candidates BIGINT,
    total_reports BIGINT,
    hire_rate DECIMAL,
    active_jobs BIGINT,
    paused_jobs BIGINT,
    new_jobs_today BIGINT,
    interviews_today BIGINT,
    reports_today BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM job_postings WHERE company_id = p_company_id) as total_jobs,
        (SELECT COUNT(*) FROM interviews WHERE company_id = p_company_id) as total_interviews,
        (SELECT COUNT(DISTINCT candidate_id) FROM interviews WHERE company_id = p_company_id) as total_candidates,
        (SELECT COUNT(*) FROM interview_reports WHERE company_id = p_company_id) as total_reports,
        (SELECT 
            CASE 
                WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE recommendation = 'hire')::DECIMAL / COUNT(*)) * 100, 2)
                ELSE 0 
            END
         FROM interview_reports WHERE company_id = p_company_id) as hire_rate,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = p_company_id AND status = 'active') as active_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = p_company_id AND status = 'paused') as paused_jobs,
        (SELECT COUNT(*) FROM job_postings WHERE company_id = p_company_id AND DATE(created_at) = CURRENT_DATE) as new_jobs_today,
        (SELECT COUNT(*) FROM interviews WHERE company_id = p_company_id AND DATE(created_at) = CURRENT_DATE) as interviews_today,
        (SELECT COUNT(*) FROM interview_reports WHERE company_id = p_company_id AND DATE(created_at) = CURRENT_DATE) as reports_today;
END;
$$ LANGUAGE plpgsql;

-- Function to get trend data for charts
CREATE OR REPLACE FUNCTION get_analytics_trends(
    p_company_id UUID,
    p_trend_type VARCHAR(50),
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    trend_date DATE,
    trend_value INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as trend_date,
        COUNT(*)::INTEGER as trend_value
    FROM (
        SELECT created_at FROM job_postings WHERE company_id = p_company_id AND p_trend_type = 'jobs'
        UNION ALL
        SELECT created_at FROM interviews WHERE company_id = p_company_id AND p_trend_type = 'interviews'
        UNION ALL
        SELECT created_at FROM interview_reports WHERE company_id = p_company_id AND p_trend_type = 'reports'
    ) as trend_data
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY DATE(created_at)
    ORDER BY trend_date;
END;
$$ LANGUAGE plpgsql;

-- Function to log analytics events
CREATE OR REPLACE FUNCTION log_analytics_event(
    p_company_id UUID,
    p_user_id UUID,
    p_event_type VARCHAR(100),
    p_event_category VARCHAR(50),
    p_event_action VARCHAR(50),
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO analytics_events (
        company_id, user_id, event_type, event_category, event_action, metadata
    ) VALUES (
        p_company_id, p_user_id, p_event_type, p_event_category, p_event_action, p_metadata
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log events when jobs are created/updated
CREATE OR REPLACE FUNCTION trigger_log_job_events()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_analytics_event(
            NEW.company_id,
            NEW.created_by,
            'job_created',
            'job',
            'created',
            jsonb_build_object('job_id', NEW.id, 'job_title', NEW.job_title, 'department', NEW.department)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_analytics_event(
            NEW.company_id,
            NEW.created_by,
            'job_updated',
            'job',
            'updated',
            jsonb_build_object('job_id', NEW.id, 'job_title', NEW.job_title, 'status', NEW.status)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_analytics_event(
            OLD.company_id,
            OLD.created_by,
            'job_deleted',
            'job',
            'deleted',
            jsonb_build_object('job_id', OLD.id, 'job_title', OLD.job_title)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic event logging
CREATE TRIGGER job_events_trigger
    AFTER INSERT OR UPDATE OR DELETE ON job_postings
    FOR EACH ROW EXECUTE FUNCTION trigger_log_job_events();

-- Trigger for interview events
CREATE OR REPLACE FUNCTION trigger_log_interview_events()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_analytics_event(
            NEW.company_id,
            NEW.created_by,
            'interview_created',
            'interview',
            'created',
            jsonb_build_object('interview_id', NEW.id, 'candidate_id', NEW.candidate_id, 'job_id', NEW.job_id)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_analytics_event(
            NEW.company_id,
            NEW.created_by,
            'interview_updated',
            'interview',
            'updated',
            jsonb_build_object('interview_id', NEW.id, 'status', NEW.status)
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interview_events_trigger
    AFTER INSERT OR UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION trigger_log_interview_events();

-- Trigger for report events
CREATE OR REPLACE FUNCTION trigger_log_report_events()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_analytics_event(
            NEW.company_id,
            NEW.created_by,
            'report_generated',
            'report',
            'created',
            jsonb_build_object('report_id', NEW.id, 'interview_id', NEW.interview_id, 'recommendation', NEW.recommendation)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_events_trigger
    AFTER INSERT ON interview_reports
    FOR EACH ROW EXECUTE FUNCTION trigger_log_report_events();

-- Add updated_at trigger for analytics_metrics
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_metrics_updated_at
    BEFORE UPDATE ON analytics_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_trends_updated_at
    BEFORE UPDATE ON analytics_trends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_dashboard_settings_updated_at
    BEFORE UPDATE ON analytics_dashboard_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

