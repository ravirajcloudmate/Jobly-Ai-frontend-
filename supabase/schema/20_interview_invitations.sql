-- Interview Invitations and Link Management Schema
-- This schema handles interview invitations, unique links, and workflow management

-- Drop existing table if exists to ensure clean recreation
DROP TABLE IF EXISTS interview_invitations CASCADE;

-- Create interview_invitations table
CREATE TABLE interview_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_id UUID REFERENCES job_postings(id) ON DELETE CASCADE, -- Can also reference jobs table
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Candidate information
    candidate_email VARCHAR(255) NOT NULL,
    candidate_name VARCHAR(255),
    
    -- Interview configuration
    interview_link VARCHAR(500) NOT NULL UNIQUE, -- Unique interview URL
    interview_token VARCHAR(100) NOT NULL UNIQUE, -- Secure token for link
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- AI Interview settings (inherited from job posting)
    ai_template TEXT NOT NULL,
    interview_mode VARCHAR(50) DEFAULT 'video' CHECK (interview_mode IN ('video', 'audio', 'text')),
    interview_language VARCHAR(10) DEFAULT 'en',
    interview_duration INTEGER DEFAULT 30,
    questions_count INTEGER DEFAULT 5,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'started', 'completed', 'expired', 'cancelled')),
    invitation_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    link_opened_at TIMESTAMP WITH TIME ZONE,
    interview_started_at TIMESTAMP WITH TIME ZONE,
    interview_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Interview results (populated after completion)
    interview_id UUID REFERENCES interviews(id) ON DELETE SET NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    
    -- Metadata
    email_delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (email_delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_interview_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interview_invitations_updated_at_trigger
    BEFORE UPDATE ON interview_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_interview_invitations_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_interview_invitations_company_id ON interview_invitations(company_id);
CREATE INDEX idx_interview_invitations_job_id ON interview_invitations(job_id);
CREATE INDEX idx_interview_invitations_created_by ON interview_invitations(created_by);
CREATE INDEX idx_interview_invitations_candidate_email ON interview_invitations(candidate_email);
CREATE INDEX idx_interview_invitations_status ON interview_invitations(status);
CREATE INDEX idx_interview_invitations_token ON interview_invitations(interview_token);
CREATE INDEX idx_interview_invitations_expires_at ON interview_invitations(expires_at);

-- RPC function to create interview invitation
CREATE OR REPLACE FUNCTION create_interview_invitation(
    p_company_id UUID,
    p_job_id UUID,
    p_created_by UUID,
    p_candidate_email VARCHAR(255),
    p_candidate_name VARCHAR(255) DEFAULT NULL,
    p_ai_template TEXT DEFAULT NULL,
    p_interview_mode VARCHAR(50) DEFAULT 'video',
    p_interview_language VARCHAR(10) DEFAULT 'en',
    p_interview_duration INTEGER DEFAULT 30,
    p_questions_count INTEGER DEFAULT 5,
    p_difficulty_level VARCHAR(20) DEFAULT 'medium',
    p_expires_in_hours INTEGER DEFAULT 168 -- 7 days default
)
RETURNS TABLE(invitation_id UUID, interview_link VARCHAR(500), interview_token VARCHAR(100)) AS $$
DECLARE
    new_invitation_id UUID;
    new_token VARCHAR(100);
    new_link VARCHAR(500);
    job_template TEXT;
BEGIN
    -- Generate unique token
    new_token := encode(gen_random_bytes(32), 'hex');
    
    -- Generate unique interview link
    new_link := 'https://interview-ai.com/join/' || new_token;
    
    -- Get AI template from job posting if not provided
    IF p_ai_template IS NULL THEN
        SELECT ai_interview_template INTO job_template
        FROM job_postings 
        WHERE id = p_job_id;
        
        IF job_template IS NULL THEN
            job_template := 'Standard interview questions about experience, skills, and cultural fit.';
        END IF;
    ELSE
        job_template := p_ai_template;
    END IF;
    
    -- Insert invitation
    INSERT INTO interview_invitations (
        company_id,
        job_id,
        created_by,
        candidate_email,
        candidate_name,
        interview_link,
        interview_token,
        expires_at,
        ai_template,
        interview_mode,
        interview_language,
        interview_duration,
        questions_count,
        difficulty_level
    ) VALUES (
        p_company_id,
        p_job_id,
        p_created_by,
        p_candidate_email,
        p_candidate_name,
        new_link,
        new_token,
        NOW() + INTERVAL '1 hour' * p_expires_in_hours,
        job_template,
        p_interview_mode,
        p_interview_language,
        p_interview_duration,
        p_questions_count,
        p_difficulty_level
    ) RETURNING id INTO new_invitation_id;
    
    RETURN QUERY SELECT new_invitation_id, new_link, new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to update invitation status
CREATE OR REPLACE FUNCTION update_invitation_status(
    p_invitation_id UUID,
    p_status VARCHAR(20),
    p_timestamp_field VARCHAR(50) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update status
    UPDATE interview_invitations 
    SET status = p_status
    WHERE id = p_invitation_id;
    
    -- Update specific timestamp based on status
    IF p_timestamp_field = 'link_opened_at' THEN
        UPDATE interview_invitations 
        SET link_opened_at = NOW()
        WHERE id = p_invitation_id;
    ELSIF p_timestamp_field = 'interview_started_at' THEN
        UPDATE interview_invitations 
        SET interview_started_at = NOW()
        WHERE id = p_invitation_id;
    ELSIF p_timestamp_field = 'interview_completed_at' THEN
        UPDATE interview_invitations 
        SET interview_completed_at = NOW()
        WHERE id = p_invitation_id;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to send reminder
CREATE OR REPLACE FUNCTION send_interview_reminder(
    p_invitation_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE interview_invitations 
    SET 
        reminder_sent_count = reminder_sent_count + 1,
        last_reminder_sent_at = NOW()
    WHERE id = p_invitation_id
    AND status IN ('sent', 'opened'); -- Only send reminders for pending interviews
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON interview_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION create_interview_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION update_invitation_status TO authenticated;
GRANT EXECUTE ON FUNCTION send_interview_reminder TO authenticated;
