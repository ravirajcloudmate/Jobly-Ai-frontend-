-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'hr_manager', 'recruiter', 'viewer');
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contract', 'internship');
CREATE TYPE job_status AS ENUM ('draft', 'active', 'paused', 'closed');
CREATE TYPE candidate_status AS ENUM ('applied', 'screening', 'interview_scheduled', 'interviewed', 'hired', 'rejected');
CREATE TYPE interview_type AS ENUM ('ai', 'human', 'hybrid');
CREATE TYPE interview_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE recommendation_type AS ENUM ('hire', 'maybe', 'no_hire');
CREATE TYPE plan_type AS ENUM ('starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing');
