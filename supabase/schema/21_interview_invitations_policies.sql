-- Row Level Security policies for interview_invitations table

-- Enable RLS
ALTER TABLE interview_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company members can view interview invitations" ON interview_invitations;
DROP POLICY IF EXISTS "Company members can create interview invitations" ON interview_invitations;
DROP POLICY IF EXISTS "Company members can update interview invitations" ON interview_invitations;
DROP POLICY IF EXISTS "Company members can delete interview invitations" ON interview_invitations;

-- Policy: Company members can view their company's interview invitations
CREATE POLICY "Company members can view interview invitations" ON interview_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = interview_invitations.company_id
        )
    );

-- Policy: Company members can create interview invitations for their company
CREATE POLICY "Company members can create interview invitations" ON interview_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = interview_invitations.company_id
        )
        AND created_by = auth.uid()
    );

-- Policy: Company members can update their company's interview invitations
CREATE POLICY "Company members can update interview invitations" ON interview_invitations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = interview_invitations.company_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = interview_invitations.company_id
        )
    );

-- Policy: Company members can delete their company's interview invitations
CREATE POLICY "Company members can delete interview invitations" ON interview_invitations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = interview_invitations.company_id
        )
    );
