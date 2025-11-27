-- COMPANY SETTINGS TABLE
-- This table stores company-specific settings organized by category
-- Categories: 'email', 'security', 'notifications', 'integrations', etc.

CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'email', 'security', 'notifications', 'integrations', etc.
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(company_id, category)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_settings_company_id ON company_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_company_settings_category ON company_settings(category);

-- Add comments
COMMENT ON TABLE company_settings IS 'Stores company-specific settings organized by category';
COMMENT ON COLUMN company_settings.category IS 'Category of settings (e.g., email, security, notifications)';
COMMENT ON COLUMN company_settings.settings IS 'JSONB object containing the actual settings for this category';
