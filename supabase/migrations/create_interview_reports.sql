-- Create interview_reports table for storing candidate performance analytics
CREATE TABLE IF NOT EXISTS interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES interview_invitations(id) ON DELETE CASCADE,
  room_id TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  candidate_email TEXT NOT NULL,
  candidate_name TEXT,
  
  -- Performance Metrics
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  partial_answers INTEGER DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  
  -- Additional Metrics (JSONB for flexibility)
  performance_metrics JSONB DEFAULT '{}',
  
  -- Analysis
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT,
  transcript_summary TEXT,
  
  -- Timing
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_reports_invitation ON interview_reports(invitation_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_company ON interview_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_job ON interview_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_candidate_email ON interview_reports(candidate_email);
CREATE INDEX IF NOT EXISTS idx_interview_reports_created_at ON interview_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_reports_total_score ON interview_reports(total_score DESC);

-- Enable Row Level Security
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view reports for their company"
  ON interview_reports FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports for their company"
  ON interview_reports FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update reports for their company"
  ON interview_reports FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Add final_score column to interview_invitations if it doesn't exist
ALTER TABLE interview_invitations 
ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2) DEFAULT 0;

-- Comment on table
COMMENT ON TABLE interview_reports IS 'Stores detailed performance analytics and reports for completed interviews';


