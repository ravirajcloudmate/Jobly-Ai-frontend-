-- Add unique constraint on invitation_id for interview_transcripts
-- This allows upsert operations to work properly
-- NOTE: Existing interview_transcripts table structure remains unchanged

-- Check if constraint already exists before adding
DO $$ 
BEGIN
  -- Check if unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'interview_transcripts_invitation_id_unique'
  ) THEN
    -- Add unique constraint
    ALTER TABLE public.interview_transcripts
    ADD CONSTRAINT interview_transcripts_invitation_id_unique UNIQUE (invitation_id);
    
    -- Add comment
    COMMENT ON CONSTRAINT interview_transcripts_invitation_id_unique ON interview_transcripts 
    IS 'Ensures each invitation has only one transcript record';
  END IF;
END $$;

