-- RLS POLICIES (fixed, non-recursive)

-- Companies policies
CREATE POLICY IF NOT EXISTS "Users can view their own company" ON companies
    FOR SELECT USING (id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Admins can update their company" ON companies
    FOR UPDATE USING (id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Users policies
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can view company members" ON users
    FOR SELECT USING (
        company_id IN (
            SELECT u.company_id 
            FROM users u 
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Admins can manage company users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 
            FROM users admin_user 
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role IN ('admin', 'hr_manager')
            AND admin_user.company_id = users.company_id
        )
    );

CREATE POLICY IF NOT EXISTS "Allow user creation during signup" ON users
    FOR INSERT WITH CHECK (id = auth.uid());

-- Jobs policies
CREATE POLICY IF NOT EXISTS "Company members can view jobs" ON jobs
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "HR roles can manage jobs" ON jobs
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Candidates policies
CREATE POLICY IF NOT EXISTS "Company members can view candidates" ON candidates
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "HR roles can manage candidates" ON candidates
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Interviews policies
CREATE POLICY IF NOT EXISTS "Company members can view interviews" ON interviews
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "HR roles can manage interviews" ON interviews
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Interview reports policies
CREATE POLICY IF NOT EXISTS "Company members can view reports" ON interview_reports
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "HR roles can manage reports" ON interview_reports
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role IN ('admin', 'hr_manager', 'recruiter')
    ));

-- Subscriptions policies
CREATE POLICY IF NOT EXISTS "Company members can view subscription" ON subscriptions
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Admins can manage subscription" ON subscriptions
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ));

-- Analytics policies
CREATE POLICY IF NOT EXISTS "Company members can view analytics" ON analytics_events
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "System can insert analytics" ON analytics_events
    FOR INSERT WITH CHECK (true);

-- Company settings policies
CREATE POLICY IF NOT EXISTS "Company members can view settings" ON company_settings
    FOR SELECT USING (company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY IF NOT EXISTS "Admins can manage settings" ON company_settings
    FOR ALL USING (company_id IN (
        SELECT company_id FROM users 
        WHERE id = auth.uid() AND role = 'admin'
    ));
