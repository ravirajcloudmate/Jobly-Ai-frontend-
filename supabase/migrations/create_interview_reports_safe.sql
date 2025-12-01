-- Safe Migration for Interview Reports Table
-- This version handles dependencies properly

-- Step 1: Check and create interview_invitations table if needed
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

-- Step 2: Create interview_reports table (without strict foreign keys initially)
CREATE TABLE IF NOT EXISTS interview_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID,  -- Will add foreign key later if table exists
  room_id TEXT,
  company_id UUID,
  job_id UUID,
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

-- Step 3: Add foreign key constraints only if parent tables exist
DO $$
BEGIN
  -- Add FK for invitation_id if interview_invitations table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'interview_invitations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'interview_reports_invitation_id_fkey'
    ) THEN
      ALTER TABLE interview_reports 
        ADD CONSTRAINT interview_reports_invitation_id_fkey 
        FOREIGN KEY (invitation_id) 
        REFERENCES interview_invitations(id) 
        ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add FK for company_id if companies table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'interview_reports_company_id_fkey'
    ) THEN
      ALTER TABLE interview_reports 
        ADD CONSTRAINT interview_reports_company_id_fkey 
        FOREIGN KEY (company_id) 
        REFERENCES companies(id) 
        ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add FK for job_id if job_postings table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_postings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'interview_reports_job_id_fkey'
    ) THEN
      ALTER TABLE interview_reports 
        ADD CONSTRAINT interview_reports_job_id_fkey 
        FOREIGN KEY (job_id) 
        REFERENCES job_postings(id) 
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_reports_invitation ON interview_reports(invitation_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_company ON interview_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_job ON interview_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_reports_candidate_email ON interview_reports(candidate_email);
CREATE INDEX IF NOT EXISTS idx_interview_reports_created_at ON interview_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_reports_total_score ON interview_reports(total_score DESC);

-- Step 5: Enable Row Level Security
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view reports for their company" ON interview_reports;
DROP POLICY IF EXISTS "Users can insert reports for their company" ON interview_reports;
DROP POLICY IF EXISTS "Users can update reports for their company" ON interview_reports;

-- Step 7: Create RLS Policies
CREATE POLICY "Users can view reports for their company"
  ON interview_reports FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR company_id IS NULL  -- Allow viewing reports without company_id (for testing)
  );

CREATE POLICY "Users can insert reports for their company"
  ON interview_reports FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR company_id IS NULL  -- Allow inserting reports without company_id (for testing)
  );

CREATE POLICY "Users can update reports for their company"
  ON interview_reports FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
    OR company_id IS NULL  -- Allow updating reports without company_id (for testing)
  );

-- Step 8: Add final_score column to interview_invitations if it doesn't exist
ALTER TABLE interview_invitations 
ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2) DEFAULT 0;

-- Step 9: Add comment on table
COMMENT ON TABLE interview_reports IS 'Stores detailed performance analytics and reports for completed interviews';

-- Step 10: Grant permissions (optional, for service role)
-- GRANT ALL ON interview_reports TO authenticated;
-- GRANT ALL ON interview_reports TO service_role;


