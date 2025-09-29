-- Update users table to add subscription fields
-- This script adds the missing subscription columns to existing users table

-- Add subscription_plan column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_plan'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_plan VARCHAR(50) DEFAULT 'free' 
        CHECK (subscription_plan IN ('free', 'pro', 'enterprise'));
    END IF;
END $$;

-- Add subscription_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active' 
        CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'expired'));
    END IF;
END $$;

-- Add subscription_started_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_started_at'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add subscription_ends_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_ends_at'
    ) THEN
        ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update existing users to have default subscription values
UPDATE users 
SET 
    subscription_plan = 'free',
    subscription_status = 'active',
    subscription_started_at = created_at
WHERE subscription_plan IS NULL OR subscription_status IS NULL;
