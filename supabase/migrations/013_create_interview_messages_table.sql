-- Create interview_messages table to store individual transcript messages
-- This table stores each message separately for better querying and normalization
-- NOTE: This is a NEW table - existing interview_transcripts table remains unchanged

-- Check if table already exists (in case there's a similar table with different structure)
DO $$ 
BEGIN
  -- Create the table only if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'interview_messages'
  ) THEN
    CREATE TABLE public.interview_messages (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      transcript_id UUID NOT NULL REFERENCES interview_transcripts(id) ON DELETE CASCADE,
      speaker VARCHAR(50) NOT NULL CHECK (speaker IN ('agent', 'candidate')),
      text TEXT NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better performance
    CREATE INDEX idx_interview_messages_transcript_id ON interview_messages(transcript_id);
    CREATE INDEX idx_interview_messages_speaker ON interview_messages(speaker);
    CREATE INDEX idx_interview_messages_timestamp ON interview_messages(timestamp);
    CREATE INDEX idx_interview_messages_transcript_timestamp ON interview_messages(transcript_id, timestamp);

    -- Add comments
    COMMENT ON TABLE interview_messages IS 'Stores individual messages from interview transcripts (NEW table)';
    COMMENT ON COLUMN interview_messages.speaker IS 'Either "agent" or "candidate"';
    COMMENT ON COLUMN interview_messages.timestamp IS 'ISO format timestamp when the message was spoken';
  END IF;
END $$;

