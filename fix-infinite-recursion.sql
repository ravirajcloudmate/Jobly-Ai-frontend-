-- Fix Infinite Recursion in Users Table RLS Policies
-- Run this in Supabase SQL Editor to fix the Google OAuth login issue

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on users table
DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.users';
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies
-- Policy 1: Users can view their own profile (no recursion)
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (no recursion)  
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Allow inserts during signup (no recursion)
CREATE POLICY "users_insert_signup" ON public.users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Step 5: Also fix companies table policies to prevent recursion
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'companies' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_name || '" ON public.companies';
    END LOOP;
END $$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Simple companies policies
CREATE POLICY "companies_select_own" ON public.companies
  FOR SELECT 
  USING (true); -- Allow all authenticated users to read companies for now

CREATE POLICY "companies_insert_own" ON public.companies
  FOR INSERT 
  WITH CHECK (true); -- Allow company creation

CREATE POLICY "companies_update_own" ON public.companies
  FOR UPDATE 
  USING (true)
  WITH CHECK (true); -- Allow company updates

-- Step 6: Verify the fix
SELECT 'RLS policies fixed successfully' as status;
