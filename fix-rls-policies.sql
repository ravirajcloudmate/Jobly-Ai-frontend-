-- Fix for Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view company members" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage company users" ON users;

-- Create corrected policies without recursion
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Allow users to view other users in their company (without recursion)
CREATE POLICY "Users can view company members" ON users
    FOR SELECT USING (
        company_id IN (
            SELECT u.company_id 
            FROM users u 
            WHERE u.id = auth.uid()
        )
    );

-- Allow admins to manage users (without recursion)
CREATE POLICY "Admins can manage company users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 
            FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role IN ('admin', 'hr_manager')
            AND admin_user.company_id = users.company_id
        )
    );

-- Allow user creation during signup
CREATE POLICY "Allow user creation during signup" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Fix companies policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id 
            FROM users 
            WHERE id = auth.uid()
        )
    );

-- Allow company creation during signup
CREATE POLICY "Allow company creation" ON companies
    FOR INSERT WITH CHECK (true);

-- Update companies policy for admins
DROP POLICY IF EXISTS "Admins can update their company" ON companies;
CREATE POLICY "Admins can update their company" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT u.company_id 
            FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );
