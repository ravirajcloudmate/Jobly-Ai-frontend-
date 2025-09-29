-- Row Level Security policies for job_postings table

-- Enable RLS
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Company members can view job postings" ON job_postings;
DROP POLICY IF EXISTS "Company members can create job postings" ON job_postings;
DROP POLICY IF EXISTS "Company members can update job postings" ON job_postings;
DROP POLICY IF EXISTS "Company members can delete job postings" ON job_postings;

-- Policy: Company members can view their company's job postings
CREATE POLICY "Company members can view job postings" ON job_postings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = job_postings.company_id
        )
    );

-- Policy: Company members can create job postings for their company
CREATE POLICY "Company members can create job postings" ON job_postings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = job_postings.company_id
        )
        AND created_by = auth.uid()
    );

-- Policy: Company members can update their company's job postings
CREATE POLICY "Company members can update job postings" ON job_postings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = job_postings.company_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = job_postings.company_id
        )
    );

-- Policy: Company members can delete their company's job postings
CREATE POLICY "Company members can delete job postings" ON job_postings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.company_id = job_postings.company_id
        )
    );
