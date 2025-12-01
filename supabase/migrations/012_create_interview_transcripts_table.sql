-- Create interview_transcripts table to store conversation transcripts
-- This table stores all the conversation between agent and candidate during interviews

CREATE TABLE IF NOT EXISTS public.interview_transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID REFERENCES interview_invitations(id) ON DELETE CASCADE,
  room_id VARCHAR(255) NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  
  -- Transcript data (stored as JSON array of messages)
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Candidate info (for quick access)
  candidate_email VARCHAR(255),
  candidate_name VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_invitation_id ON interview_transcripts(invitation_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_room_id ON interview_transcripts(room_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_company_id ON interview_transcripts(company_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_job_id ON interview_transcripts(job_id);
CREATE INDEX IF NOT EXISTS idx_interview_transcripts_candidate_email ON interview_transcripts(candidate_email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_interview_transcripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interview_transcripts_updated_at_trigger
    BEFORE UPDATE ON interview_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_transcripts_updated_at();

-- Add comment
COMMENT ON TABLE interview_transcripts IS 'Stores complete conversation transcripts between AI agent and candidates during interviews';
COMMENT ON COLUMN interview_transcripts.transcript IS 'JSON array of message objects with speaker, text, and timestamp fields';

