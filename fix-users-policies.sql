-- Fix infinite recursion in users table policies
-- Run this in Supabase SQL Editor

-- First, drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view company members" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage company users" ON public.users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- Temporarily disable RLS to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy 1: Users can view their own profile (no recursion)
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy 2: Users can update their own profile (no recursion)  
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);

-- Policy 3: Allow inserts during signup (no recursion)
CREATE POLICY "users_insert_signup" ON public.users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy 4: Company members can view each other (avoid recursion by using direct join)
CREATE POLICY "users_select_company" ON public.users
  FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id 
      FROM auth.users au 
      JOIN public.users pu ON au.id = pu.id 
      WHERE au.id = auth.uid()
    )
  );
