-- COMPANIES TABLE
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    industry VARCHAR(100),
    size VARCHAR(50),
    description TEXT,
    settings JSONB DEFAULT '{
        "branding": {
            "primary_color": "#3B82F6",
            "secondary_color": "#6366F1"
        },
        "interview_settings": {
            "default_duration": 30,
            "recording_enabled": true,
            "ai_analysis_enabled": true
        },
        "notifications": {
            "email_enabled": true
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
