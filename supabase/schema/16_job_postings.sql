-- Job Postings Schema
-- This schema handles job postings with AI interview templates and configurations

-- Drop existing table if exists to ensure clean recreation
DROP TABLE IF EXISTS job_postings CASCADE;

-- Create job_postings table
CREATE TABLE job_postings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic job information
    job_title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    
    -- AI Interview Configuration
    ai_interview_template TEXT NOT NULL,
    interview_mode VARCHAR(50) NOT NULL DEFAULT 'video' CHECK (interview_mode IN ('video', 'audio', 'text')),
    interview_language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (interview_language IN ('en', 'es', 'fr', 'de', 'hi', 'zh')),
    
    -- Additional job details
    employment_type VARCHAR(50) DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
    experience_level VARCHAR(50) DEFAULT 'mid-level' CHECK (experience_level IN ('entry-level', 'mid-level', 'senior-level', 'executive')),
    location VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Job posting status and settings
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
    is_remote BOOLEAN DEFAULT false,
    applications_count INTEGER DEFAULT 0,
    
    -- AI Interview Settings
    interview_duration INTEGER DEFAULT 30, -- in minutes
    questions_count INTEGER DEFAULT 5,
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_postings_updated_at_trigger
    BEFORE UPDATE ON job_postings
    FOR EACH ROW
    EXECUTE FUNCTION update_job_postings_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_job_postings_company_id ON job_postings(company_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_created_by ON job_postings(created_by);
CREATE INDEX idx_job_postings_department ON job_postings(department);
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at);

-- RPC function to create a new job posting
CREATE OR REPLACE FUNCTION create_job_posting(
    p_company_id UUID,
    p_created_by UUID,
    p_job_title VARCHAR(255),
    p_department VARCHAR(255),
    p_job_description TEXT,
    p_ai_interview_template TEXT,
    p_interview_mode VARCHAR(50) DEFAULT 'video',
    p_interview_language VARCHAR(10) DEFAULT 'en',
    p_employment_type VARCHAR(50) DEFAULT 'full-time',
    p_experience_level VARCHAR(50) DEFAULT 'mid-level',
    p_location VARCHAR(255) DEFAULT NULL,
    p_salary_min INTEGER DEFAULT NULL,
    p_salary_max INTEGER DEFAULT NULL,
    p_currency VARCHAR(3) DEFAULT 'USD',
    p_is_remote BOOLEAN DEFAULT false,
    p_interview_duration INTEGER DEFAULT 30,
    p_questions_count INTEGER DEFAULT 5,
    p_difficulty_level VARCHAR(20) DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    new_job_id UUID;
BEGIN
    INSERT INTO job_postings (
        company_id,
        created_by,
        job_title,
        department,
        job_description,
        ai_interview_template,
        interview_mode,
        interview_language,
        employment_type,
        experience_level,
        location,
        salary_min,
        salary_max,
        currency,
        is_remote,
        interview_duration,
        questions_count,
        difficulty_level
    ) VALUES (
        p_company_id,
        p_created_by,
        p_job_title,
        p_department,
        p_job_description,
        p_ai_interview_template,
        p_interview_mode,
        p_interview_language,
        p_employment_type,
        p_experience_level,
        p_location,
        p_salary_min,
        p_salary_max,
        p_currency,
        p_is_remote,
        p_interview_duration,
        p_questions_count,
        p_difficulty_level
    ) RETURNING id INTO new_job_id;
    
    RETURN new_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to update job posting
CREATE OR REPLACE FUNCTION update_job_posting(
    p_job_id UUID,
    p_job_title VARCHAR(255) DEFAULT NULL,
    p_department VARCHAR(255) DEFAULT NULL,
    p_job_description TEXT DEFAULT NULL,
    p_ai_interview_template TEXT DEFAULT NULL,
    p_interview_mode VARCHAR(50) DEFAULT NULL,
    p_interview_language VARCHAR(10) DEFAULT NULL,
    p_employment_type VARCHAR(50) DEFAULT NULL,
    p_experience_level VARCHAR(50) DEFAULT NULL,
    p_location VARCHAR(255) DEFAULT NULL,
    p_salary_min INTEGER DEFAULT NULL,
    p_salary_max INTEGER DEFAULT NULL,
    p_currency VARCHAR(3) DEFAULT NULL,
    p_is_remote BOOLEAN DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT NULL,
    p_interview_duration INTEGER DEFAULT NULL,
    p_questions_count INTEGER DEFAULT NULL,
    p_difficulty_level VARCHAR(20) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE job_postings SET
        job_title = COALESCE(p_job_title, job_title),
        department = COALESCE(p_department, department),
        job_description = COALESCE(p_job_description, job_description),
        ai_interview_template = COALESCE(p_ai_interview_template, ai_interview_template),
        interview_mode = COALESCE(p_interview_mode, interview_mode),
        interview_language = COALESCE(p_interview_language, interview_language),
        employment_type = COALESCE(p_employment_type, employment_type),
        experience_level = COALESCE(p_experience_level, experience_level),
        location = COALESCE(p_location, location),
        salary_min = COALESCE(p_salary_min, salary_min),
        salary_max = COALESCE(p_salary_max, salary_max),
        currency = COALESCE(p_currency, currency),
        is_remote = COALESCE(p_is_remote, is_remote),
        status = COALESCE(p_status, status),
        interview_duration = COALESCE(p_interview_duration, interview_duration),
        questions_count = COALESCE(p_questions_count, questions_count),
        difficulty_level = COALESCE(p_difficulty_level, difficulty_level),
        published_at = CASE WHEN p_status = 'active' AND published_at IS NULL THEN NOW() ELSE published_at END
    WHERE id = p_job_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to delete job posting
CREATE OR REPLACE FUNCTION delete_job_posting(p_job_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM job_postings WHERE id = p_job_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON job_postings TO authenticated;
GRANT EXECUTE ON FUNCTION create_job_posting TO authenticated;
GRANT EXECUTE ON FUNCTION update_job_posting TO authenticated;
GRANT EXECUTE ON FUNCTION delete_job_posting TO authenticated;
