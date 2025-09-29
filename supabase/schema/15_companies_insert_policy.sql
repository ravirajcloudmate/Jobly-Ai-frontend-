-- Allow authenticated users to create a company row
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create company" ON companies;
CREATE POLICY "Users can create company" ON companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


