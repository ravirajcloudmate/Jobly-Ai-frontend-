-- COMPANY BRANDING SETTINGS
-- Stores fields used by `app/components/CompanyProfile.tsx`

-- First, drop the table if it exists to recreate with new structure
DROP TABLE IF EXISTS company_branding CASCADE;

-- Create the table with all required fields
CREATE TABLE company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Company fields
  company_name TEXT,
  industry TEXT,

  -- Branding fields
  logo_url TEXT,
  welcome_message TEXT,
  primary_color TEXT DEFAULT '#030213',
  secondary_color TEXT DEFAULT '#6366F1',
  background_color TEXT DEFAULT '#F8FAFC',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT company_branding_company_unique UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE company_branding ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Company members can view branding" ON company_branding
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_company_branding_company_id ON company_branding(company_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_company_branding_updated_at ON company_branding;
CREATE TRIGGER trg_company_branding_updated_at
  BEFORE UPDATE ON company_branding
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Upsert function for company_branding
CREATE OR REPLACE FUNCTION upsert_company_branding(
  p_company_id UUID,
  p_company_name TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_welcome_message TEXT DEFAULT NULL,
  p_primary_color TEXT DEFAULT '#030213',
  p_secondary_color TEXT DEFAULT '#6366F1',
  p_background_color TEXT DEFAULT '#F8FAFC'
) RETURNS company_branding AS $$
DECLARE
  v_row company_branding;
BEGIN
  INSERT INTO company_branding (
    company_id, 
    company_name, 
    industry, 
    logo_url, 
    welcome_message,
    primary_color, 
    secondary_color, 
    background_color
  ) VALUES (
    p_company_id, 
    p_company_name, 
    p_industry, 
    p_logo_url, 
    p_welcome_message,
    p_primary_color, 
    p_secondary_color, 
    p_background_color
  )
  ON CONFLICT (company_id) DO UPDATE SET
    company_name = COALESCE(EXCLUDED.company_name, company_branding.company_name),
    industry = COALESCE(EXCLUDED.industry, company_branding.industry),
    logo_url = COALESCE(EXCLUDED.logo_url, company_branding.logo_url),
    welcome_message = COALESCE(EXCLUDED.welcome_message, company_branding.welcome_message),
    primary_color = COALESCE(EXCLUDED.primary_color, company_branding.primary_color),
    secondary_color = COALESCE(EXCLUDED.secondary_color, company_branding.secondary_color),
    background_color = COALESCE(EXCLUDED.background_color, company_branding.background_color),
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON company_branding TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_company_branding TO authenticated;

-- TEAM INVITATIONS TABLE
-- Stores pending team member invitations
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES users(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT team_invitations_company_email_unique UNIQUE (company_id, email)
);

-- Enable RLS for team_invitations
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for team_invitations
CREATE POLICY "Company members can view invitations" ON team_invitations
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage invitations" ON team_invitations
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'hr_manager')
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'hr_manager')
    )
  );

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_company_id ON team_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- Apply updated_at trigger to team_invitations
DROP TRIGGER IF EXISTS trg_team_invitations_updated_at ON team_invitations;
CREATE TRIGGER trg_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Function to create team invitation
CREATE OR REPLACE FUNCTION create_team_invitation(
  p_company_id UUID,
  p_email VARCHAR(255),
  p_invited_by UUID,
  p_role user_role DEFAULT 'viewer'
) RETURNS team_invitations AS $$
DECLARE
  v_token VARCHAR(255);
  v_invitation team_invitations;
BEGIN
  -- Generate unique invitation token
  v_token := encode(gen_random_bytes(32), 'hex');
  
  -- Insert invitation
  INSERT INTO team_invitations (
    company_id,
    email,
    role,
    invited_by,
    invitation_token
  ) VALUES (
    p_company_id,
    p_email,
    p_role,
    p_invited_by,
    v_token
  )
  ON CONFLICT (company_id, email) DO UPDATE SET
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    invitation_token = EXCLUDED.invitation_token,
    status = 'pending',
    expires_at = NOW() + INTERVAL '7 days',
    updated_at = NOW()
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_team_invitation TO authenticated;


