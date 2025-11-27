+-
- 011_create_company_settings_table.sql
-- Create company_settings table for storing company-specific settings by category

-- Create company_settings table if it does not exist
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- 'email', 'security', 'notifications', 'integrations', etc.
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_id, category)s
);

-- Create index on company_id for faster queries
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON public.company_settings(company_id);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_company_settings_category ON public.company_settings(category);

-- Add comment to table
COMMENT ON TABLE public.company_settings IS 'Stores company-specific settings organized by category (email, security, notifications, etc.)';

-- Add comment to columns
COMMENT ON COLUMN public.company_settings.company_id IS 'Reference to the company';
COMMENT ON COLUMN public.company_settings.category IS 'Category of settings (e.g., email, security, notifications)';
COMMENT ON COLUMN public.company_settings.settings IS 'JSONB object containing the actual settings for this category';

-- Enable Row Level Security (RLS)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their company's settings
CREATE POLICY "Users can read their company settings"
  ON public.company_settings
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Create policy: Users can insert settings for their company
CREATE POLICY "Users can insert their company settings"
  ON public.company_settings
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Create policy: Users can update their company's settings
CREATE POLICY "Users can update their company settings"
  ON public.company_settings
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Create policy: Users can delete their company's settings
CREATE POLICY "Users can delete their company settings"
  ON public.company_settings
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

