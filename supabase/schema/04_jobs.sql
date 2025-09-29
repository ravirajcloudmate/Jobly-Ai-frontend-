-- JOBS TABLE
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
