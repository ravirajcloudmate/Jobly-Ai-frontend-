-- INTERVIEW REPORTS TABLE
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
