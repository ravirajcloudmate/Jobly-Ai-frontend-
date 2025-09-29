-- Simplest possible fix - run this if the other SQL fails
-- Run this in Supabase SQL Editor

-- Disable RLS temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Drop all policies
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

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create only the most basic policies
CREATE POLICY "users_own_data" ON public.users
  FOR ALL 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
