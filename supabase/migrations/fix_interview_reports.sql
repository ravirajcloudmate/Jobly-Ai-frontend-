-- Complete Fix for Interview Reports
-- This will drop existing table and create fresh

-- Step 1: Drop existing interview_reports table if it exists (with CASCADE to drop dependencies)
DROP TABLE IF EXISTS interview_reports CASCADE;

-- Step 2: Ensure interview_invitations table exists with proper schema
CREATE TABLE IF NOT EXISTS interview_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  job_id UUID,
  candidate_email TEXT NOT NULL,
  candidate_name TEXT,
  candidate_skills TEXT,
  experience TEXT,
  interview_date DATE,
  interview_time TIME,
  candidate_projects TEXT,
  interview_link TEXT,
  status TEXT DEFAULT 'pending',
  summary TEXT,
  final_score NUMERIC(5,2) DEFAULT 0,
  interview_completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create interview_reports table with ALL columns defined upfront
CREATE TABLE interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  invitation_id UUID REFERENCES interview_invitations(id) ON DELETE CASCADE,
  company_id UUID,
  job_id UUID,
  
  -- Candidate Info
  room_id TEXT,
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
  
  -- Analysis Arrays
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  
  -- Text Fields
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

-- Step 4: Add foreign keys for company and job (if tables exist)
DO $$
BEGIN
  -- Add company FK if companies table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    ALTER TABLE interview_reports 
      ADD CONSTRAINT interview_reports_company_id_fkey 
      FOREIGN KEY (company_id) 
      REFERENCES companies(id) 
      ON DELETE CASCADE;
  END IF;

  -- Add job FK if job_postings table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_postings') THEN
    ALTER TABLE interview_reports 
      ADD CONSTRAINT interview_reports_job_id_fkey 
      FOREIGN KEY (job_id) 
      REFERENCES job_postings(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- Step 5: Create indexes for better performance
CREATE INDEX idx_interview_reports_invitation ON interview_reports(invitation_id);
CREATE INDEX idx_interview_reports_company ON interview_reports(company_id);
CREATE INDEX idx_interview_reports_job ON interview_reports(job_id);
CREATE INDEX idx_interview_reports_candidate_email ON interview_reports(candidate_email);
CREATE INDEX idx_interview_reports_created_at ON interview_reports(created_at DESC);
CREATE INDEX idx_interview_reports_total_score ON interview_reports(total_score DESC);
CREATE INDEX idx_interview_reports_ended_at ON interview_reports(ended_at DESC);

-- Step 6: Enable Row Level Security
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
CREATE POLICY "Users can view reports for their company"
  ON interview_reports FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IS NULL
  );

CREATE POLICY "Users can insert reports for their company"
  ON interview_reports FOR INSERT
  WITH CHECK (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IS NULL
  );

CREATE POLICY "Users can update reports for their company"
  ON interview_reports FOR UPDATE
  USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    OR company_id IS NULL
  );

-- Step 8: Add helpful comment
COMMENT ON TABLE interview_reports IS 'Stores detailed performance analytics and reports for completed interviews';
COMMENT ON COLUMN interview_reports.performance_metrics IS 'JSONB field containing additional metrics like response_rate, accuracy, communication_score, technical_score';
COMMENT ON COLUMN interview_reports.strengths IS 'Array of candidate strengths identified during interview';
COMMENT ON COLUMN interview_reports.weaknesses IS 'Array of areas for improvement identified during interview';


