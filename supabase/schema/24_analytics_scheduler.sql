-- ANALYTICS SCHEDULER SETUP
-- This file sets up automatic calculation of analytics metrics

-- Function to calculate and store daily metrics for all companies
CREATE OR REPLACE FUNCTION calculate_all_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    company_record RECORD;
    job_stats RECORD;
    interview_stats RECORD;
    candidate_stats RECORD;
    report_stats RECORD;
    user_stats RECORD;
BEGIN
    -- Loop through all companies
    FOR company_record IN SELECT id FROM companies LOOP
        -- Calculate job metrics
        SELECT 
            COUNT(*) as total_jobs,
            COUNT(*) FILTER (WHERE status = 'active') as active_jobs,
            COUNT(*) FILTER (WHERE status = 'paused') as paused_jobs,
            COUNT(*) FILTER (WHERE status = 'closed') as closed_jobs,
            COUNT(*) FILTER (WHERE DATE(created_at) = target_date) as new_jobs
        INTO job_stats
        FROM job_postings 
        WHERE company_id = company_record.id;
        
        -- Calculate interview metrics
        SELECT 
            COUNT(*) as total_interviews,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_interviews,
            COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_interviews,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_interviews,
            COUNT(*) FILTER (WHERE DATE(created_at) = target_date) as new_interviews
        INTO interview_stats
        FROM interviews 
        WHERE company_id = company_record.id;
        
        -- Calculate candidate metrics
        SELECT 
            COUNT(DISTINCT candidate_id) as total_candidates,
            COUNT(DISTINCT candidate_id) FILTER (WHERE DATE(created_at) = target_date) as new_candidates,
            COUNT(DISTINCT candidate_id) FILTER (WHERE status = 'interviewed') as interviewed_candidates,
            COUNT(DISTINCT candidate_id) FILTER (WHERE status = 'hired') as hired_candidates,
            COUNT(DISTINCT candidate_id) FILTER (WHERE status = 'rejected') as rejected_candidates
        INTO candidate_stats
        FROM interviews 
        WHERE company_id = company_record.id;
        
        -- Calculate report metrics
        SELECT 
            COUNT(*) as total_reports,
            COUNT(*) FILTER (WHERE DATE(created_at) = target_date) as new_reports,
            COUNT(*) FILTER (WHERE recommendation = 'hire') as hire_recommendations,
            COUNT(*) FILTER (WHERE recommendation = 'maybe') as maybe_recommendations,
            COUNT(*) FILTER (WHERE recommendation = 'no_hire') as no_hire_recommendations
        INTO report_stats
        FROM interview_reports 
        WHERE company_id = company_record.id;
        
        -- Calculate user metrics
        SELECT 
            COUNT(DISTINCT id) as active_users,
            COUNT(DISTINCT id) FILTER (WHERE DATE(created_at) = target_date) as new_users
        INTO user_stats
        FROM users 
        WHERE company_id = company_record.id;
        
        -- Calculate hire rate
        DECLARE
            hire_rate DECIMAL(5,2) := 0;
        BEGIN
            IF report_stats.total_reports > 0 THEN
                hire_rate := ROUND((report_stats.hire_recommendations::DECIMAL / report_stats.total_reports) * 100, 2);
            END IF;
            
            -- Insert or update daily metrics
            INSERT INTO analytics_metrics (
                company_id, metric_type, metric_date,
                total_jobs, active_jobs, paused_jobs, closed_jobs, new_jobs,
                total_interviews, completed_interviews, scheduled_interviews, cancelled_interviews, new_interviews,
                total_candidates, new_candidates, interviewed_candidates, hired_candidates, rejected_candidates,
                total_reports, new_reports, hire_recommendations, maybe_recommendations, no_hire_recommendations,
                average_hire_rate, active_users
            ) VALUES (
                company_record.id, 'daily', target_date,
                COALESCE(job_stats.total_jobs, 0), COALESCE(job_stats.active_jobs, 0), 
                COALESCE(job_stats.paused_jobs, 0), COALESCE(job_stats.closed_jobs, 0), COALESCE(job_stats.new_jobs, 0),
                COALESCE(interview_stats.total_interviews, 0), COALESCE(interview_stats.completed_interviews, 0),
                COALESCE(interview_stats.scheduled_interviews, 0), COALESCE(interview_stats.cancelled_interviews, 0), COALESCE(interview_stats.new_interviews, 0),
                COALESCE(candidate_stats.total_candidates, 0), COALESCE(candidate_stats.new_candidates, 0),
                COALESCE(candidate_stats.interviewed_candidates, 0), COALESCE(candidate_stats.hired_candidates, 0), COALESCE(candidate_stats.rejected_candidates, 0),
                COALESCE(report_stats.total_reports, 0), COALESCE(report_stats.new_reports, 0),
                COALESCE(report_stats.hire_recommendations, 0), COALESCE(report_stats.maybe_recommendations, 0), COALESCE(report_stats.no_hire_recommendations, 0),
                hire_rate, COALESCE(user_stats.active_users, 0)
            )
            ON CONFLICT (company_id, metric_type, metric_date) 
            DO UPDATE SET
                total_jobs = EXCLUDED.total_jobs,
                active_jobs = EXCLUDED.active_jobs,
                paused_jobs = EXCLUDED.paused_jobs,
                closed_jobs = EXCLUDED.closed_jobs,
                new_jobs = EXCLUDED.new_jobs,
                total_interviews = EXCLUDED.total_interviews,
                completed_interviews = EXCLUDED.completed_interviews,
                scheduled_interviews = EXCLUDED.scheduled_interviews,
                cancelled_interviews = EXCLUDED.cancelled_interviews,
                new_interviews = EXCLUDED.new_interviews,
                total_candidates = EXCLUDED.total_candidates,
                new_candidates = EXCLUDED.new_candidates,
                interviewed_candidates = EXCLUDED.interviewed_candidates,
                hired_candidates = EXCLUDED.hired_candidates,
                rejected_candidates = EXCLUDED.rejected_candidates,
                total_reports = EXCLUDED.total_reports,
                new_reports = EXCLUDED.new_reports,
                hire_recommendations = EXCLUDED.hire_recommendations,
                maybe_recommendations = EXCLUDED.maybe_recommendations,
                no_hire_recommendations = EXCLUDED.no_hire_recommendations,
                average_hire_rate = EXCLUDED.average_hire_rate,
                active_users = EXCLUDED.active_users,
                updated_at = NOW();
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate weekly metrics (aggregate daily metrics)
CREATE OR REPLACE FUNCTION calculate_weekly_metrics(target_week_start DATE DEFAULT DATE_TRUNC('week', CURRENT_DATE)::DATE)
RETURNS VOID AS $$
DECLARE
    company_record RECORD;
    week_end DATE := target_week_start + INTERVAL '6 days';
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        INSERT INTO analytics_metrics (
            company_id, metric_type, metric_date,
            total_jobs, active_jobs, paused_jobs, closed_jobs, new_jobs,
            total_interviews, completed_interviews, scheduled_interviews, cancelled_interviews, new_interviews,
            total_candidates, new_candidates, interviewed_candidates, hired_candidates, rejected_candidates,
            total_reports, new_reports, hire_recommendations, maybe_recommendations, no_hire_recommendations,
            average_hire_rate, active_users
        )
        SELECT 
            company_record.id,
            'weekly',
            target_week_start,
            MAX(total_jobs),
            MAX(active_jobs),
            MAX(paused_jobs),
            MAX(closed_jobs),
            SUM(new_jobs),
            MAX(total_interviews),
            MAX(completed_interviews),
            MAX(scheduled_interviews),
            MAX(cancelled_interviews),
            SUM(new_interviews),
            MAX(total_candidates),
            SUM(new_candidates),
            MAX(interviewed_candidates),
            MAX(hired_candidates),
            MAX(rejected_candidates),
            MAX(total_reports),
            SUM(new_reports),
            SUM(hire_recommendations),
            SUM(maybe_recommendations),
            SUM(no_hire_recommendations),
            AVG(average_hire_rate),
            MAX(active_users)
        FROM analytics_metrics
        WHERE company_id = company_record.id 
        AND metric_type = 'daily' 
        AND metric_date BETWEEN target_week_start AND week_end
        ON CONFLICT (company_id, metric_type, metric_date) 
        DO UPDATE SET
            total_jobs = EXCLUDED.total_jobs,
            active_jobs = EXCLUDED.active_jobs,
            paused_jobs = EXCLUDED.paused_jobs,
            closed_jobs = EXCLUDED.closed_jobs,
            new_jobs = EXCLUDED.new_jobs,
            total_interviews = EXCLUDED.total_interviews,
            completed_interviews = EXCLUDED.completed_interviews,
            scheduled_interviews = EXCLUDED.scheduled_interviews,
            cancelled_interviews = EXCLUDED.cancelled_interviews,
            new_interviews = EXCLUDED.new_interviews,
            total_candidates = EXCLUDED.total_candidates,
            new_candidates = EXCLUDED.new_candidates,
            interviewed_candidates = EXCLUDED.interviewed_candidates,
            hired_candidates = EXCLUDED.hired_candidates,
            rejected_candidates = EXCLUDED.rejected_candidates,
            total_reports = EXCLUDED.total_reports,
            new_reports = EXCLUDED.new_reports,
            hire_recommendations = EXCLUDED.hire_recommendations,
            maybe_recommendations = EXCLUDED.maybe_recommendations,
            no_hire_recommendations = EXCLUDED.no_hire_recommendations,
            average_hire_rate = EXCLUDED.average_hire_rate,
            active_users = EXCLUDED.active_users,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly metrics (aggregate daily metrics)
CREATE OR REPLACE FUNCTION calculate_monthly_metrics(target_month_start DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE)
RETURNS VOID AS $$
DECLARE
    company_record RECORD;
    month_end DATE := (target_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        INSERT INTO analytics_metrics (
            company_id, metric_type, metric_date,
            total_jobs, active_jobs, paused_jobs, closed_jobs, new_jobs,
            total_interviews, completed_interviews, scheduled_interviews, cancelled_interviews, new_interviews,
            total_candidates, new_candidates, interviewed_candidates, hired_candidates, rejected_candidates,
            total_reports, new_reports, hire_recommendations, maybe_recommendations, no_hire_recommendations,
            average_hire_rate, active_users
        )
        SELECT 
            company_record.id,
            'monthly',
            target_month_start,
            MAX(total_jobs),
            MAX(active_jobs),
            MAX(paused_jobs),
            MAX(closed_jobs),
            SUM(new_jobs),
            MAX(total_interviews),
            MAX(completed_interviews),
            MAX(scheduled_interviews),
            MAX(cancelled_interviews),
            SUM(new_interviews),
            MAX(total_candidates),
            SUM(new_candidates),
            MAX(interviewed_candidates),
            MAX(hired_candidates),
            MAX(rejected_candidates),
            MAX(total_reports),
            SUM(new_reports),
            SUM(hire_recommendations),
            SUM(maybe_recommendations),
            SUM(no_hire_recommendations),
            AVG(average_hire_rate),
            MAX(active_users)
        FROM analytics_metrics
        WHERE company_id = company_record.id 
        AND metric_type = 'daily' 
        AND metric_date BETWEEN target_month_start AND month_end
        ON CONFLICT (company_id, metric_type, metric_date) 
        DO UPDATE SET
            total_jobs = EXCLUDED.total_jobs,
            active_jobs = EXCLUDED.active_jobs,
            paused_jobs = EXCLUDED.paused_jobs,
            closed_jobs = EXCLUDED.closed_jobs,
            new_jobs = EXCLUDED.new_jobs,
            total_interviews = EXCLUDED.total_interviews,
            completed_interviews = EXCLUDED.completed_interviews,
            scheduled_interviews = EXCLUDED.scheduled_interviews,
            cancelled_interviews = EXCLUDED.cancelled_interviews,
            new_interviews = EXCLUDED.new_interviews,
            total_candidates = EXCLUDED.total_candidates,
            new_candidates = EXCLUDED.new_candidates,
            interviewed_candidates = EXCLUDED.interviewed_candidates,
            hired_candidates = EXCLUDED.hired_candidates,
            rejected_candidates = EXCLUDED.rejected_candidates,
            total_reports = EXCLUDED.total_reports,
            new_reports = EXCLUDED.new_reports,
            hire_recommendations = EXCLUDED.hire_recommendations,
            maybe_recommendations = EXCLUDED.maybe_recommendations,
            no_hire_recommendations = EXCLUDED.no_hire_recommendations,
            average_hire_rate = EXCLUDED.average_hire_rate,
            active_users = EXCLUDED.active_users,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update trend data
CREATE OR REPLACE FUNCTION update_analytics_trends(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    company_record RECORD;
    trend_data RECORD;
BEGIN
    FOR company_record IN SELECT id FROM companies LOOP
        -- Update jobs trend
        SELECT COUNT(*) as trend_value
        INTO trend_data
        FROM job_postings 
        WHERE company_id = company_record.id AND DATE(created_at) = target_date;
        
        INSERT INTO analytics_trends (company_id, trend_type, trend_period, trend_date, value)
        VALUES (company_record.id, 'jobs', 'daily', target_date, COALESCE(trend_data.trend_value, 0))
        ON CONFLICT (company_id, trend_type, trend_period, trend_date) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        
        -- Update interviews trend
        SELECT COUNT(*) as trend_value
        INTO trend_data
        FROM interviews 
        WHERE company_id = company_record.id AND DATE(created_at) = target_date;
        
        INSERT INTO analytics_trends (company_id, trend_type, trend_period, trend_date, value)
        VALUES (company_record.id, 'interviews', 'daily', target_date, COALESCE(trend_data.trend_value, 0))
        ON CONFLICT (company_id, trend_type, trend_period, trend_date) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
        
        -- Update reports trend
        SELECT COUNT(*) as trend_value
        INTO trend_data
        FROM interview_reports 
        WHERE company_id = company_record.id AND DATE(created_at) = target_date;
        
        INSERT INTO analytics_trends (company_id, trend_type, trend_period, trend_date, value)
        VALUES (company_record.id, 'reports', 'daily', target_date, COALESCE(trend_data.trend_value, 0))
        ON CONFLICT (company_id, trend_type, trend_period, trend_date) 
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_all_daily_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_weekly_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_monthly_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_analytics_trends(DATE) TO authenticated;

-- Note: To set up automatic scheduling, you would typically use pg_cron extension
-- Example cron jobs (requires pg_cron extension):
-- SELECT cron.schedule('daily-analytics', '0 1 * * *', 'SELECT calculate_all_daily_metrics();');
-- SELECT cron.schedule('weekly-analytics', '0 2 * * 1', 'SELECT calculate_weekly_metrics();');
-- SELECT cron.schedule('monthly-analytics', '0 3 1 * *', 'SELECT calculate_monthly_metrics();');
-- SELECT cron.schedule('daily-trends', '0 0 * * *', 'SELECT update_analytics_trends();');

