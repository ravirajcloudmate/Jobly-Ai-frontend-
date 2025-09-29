-- Enable RLS and add policies for company_branding

ALTER TABLE company_branding ENABLE ROW LEVEL SECURITY;

-- Company members can view branding
DROP POLICY IF EXISTS "Company members can view branding" ON company_branding;
CREATE POLICY "Company members can view branding" ON company_branding
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Company members can insert/update branding
DROP POLICY IF EXISTS "Company members can manage branding" ON company_branding;
CREATE POLICY "Company members can manage branding" ON company_branding
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );


