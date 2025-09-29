import { supabase } from '@/lib/supabase'
import type { 
  Company, 
  User, 
  Job, 
  Candidate, 
  Interview, 
  InterviewReport,
  Subscription,
  AnalyticsEvent
} from '@/lib/supabase'

// =============================================
// COMPANIES SERVICE
// =============================================
export const companiesService = {
  async getCompany(companyId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()
    
    return { data, error }
  },

  async updateCompany(companyId: string, updates: Partial<Company>) {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select()
      .single()
    
    return { data, error }
  },

  async createCompany(companyData: Omit<Company, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('companies')
      .insert(companyData)
      .select()
      .single()
    
    return { data, error }
  }
}

// =============================================
// USERS SERVICE
// =============================================
export const usersService = {
  async getUser(userId: string) {
    console.log('🔍 usersService.getUser called for userId:', userId)
    
    try {
      // First get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (userError) {
        // If user doesn't exist (PGRST116), return null data but no error
        if (userError.code === 'PGRST116') {
          console.log('ℹ️ User not found in database (PGRST116), returning null data')
          return { data: null, error: null }
        }
        
        console.error('❌ Error fetching user data:', {
          message: userError.message,
          code: userError.code,
          details: userError.details,
          hint: userError.hint
        })
        
        return { data: null, error: userError }
      }
      
      console.log('✅ User data fetched successfully:', userData)
      
      // If user has a company_id, fetch company data separately
      if (userData?.company_id) {
        console.log('🏢 Fetching company data for company_id:', userData.company_id)
        
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, domain, logo_url')
          .eq('id', userData.company_id)
          .single()
        
        if (companyError) {
          console.error('❌ Error fetching company data:', {
            message: companyError.message,
            code: companyError.code,
            details: companyError.details
          })
          // Return user data without company info if company fetch failed
          return { data: userData, error: null }
        }
        
        if (companyData) {
          console.log('✅ Company data fetched successfully:', companyData)
          // Combine user data with company data
          const data = {
            ...userData,
            companies: companyData
          }
          return { data, error: null }
        }
      }
      
      // Return user data without company info if no company or company fetch failed
      console.log('✅ Returning user data without company info')
      return { data: userData, error: null }
    } catch (error) {
      console.error('❌ Unexpected error in usersService.getUser:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      })
      return { 
        data: null, 
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          code: 'UNEXPECTED_ERROR'
        }
      }
    }
  },

  async getCompanyUsers(companyId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async updateUser(userId: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    return { data, error }
  },

  async inviteUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()
    
    return { data, error }
  },

  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
    
    return { error }
  }
}

// =============================================
// JOBS SERVICE
// =============================================
export const jobsService = {
  async getJobs(companyId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_created_by_fkey (
          full_name
        ),
        candidates (
          id,
          status
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async getJob(jobId: string) {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        users!jobs_created_by_fkey (
          full_name
        ),
        candidates (
          id,
          full_name,
          email,
          status,
          created_at
        )
      `)
      .eq('id', jobId)
      .single()
    
    return { data, error }
  },

  async createJob(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('jobs')
      .insert(jobData)
      .select()
      .single()
    
    return { data, error }
  },

  async updateJob(jobId: string, updates: Partial<Job>) {
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', jobId)
      .select()
      .single()
    
    return { data, error }
  },

  async deleteJob(jobId: string) {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId)
    
    return { error }
  }
}

// =============================================
// CANDIDATES SERVICE
// =============================================
export const candidatesService = {
  async getCandidates(companyId: string) {
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        jobs (
          id,
          title,
          location
        ),
        interviews (
          id,
          status,
          scheduled_at,
          completed_at
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async getCandidate(candidateId: string) {
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        jobs (
          id,
          title,
          description,
          location
        ),
        interviews (
          id,
          type,
          status,
          scheduled_at,
          started_at,
          completed_at,
          duration_minutes
        ),
        interview_reports (
          id,
          overall_score,
          technical_score,
          communication_score,
          cultural_fit_score,
          recommendation,
          ai_analysis
        )
      `)
      .eq('id', candidateId)
      .single()
    
    return { data, error }
  },

  async createCandidate(candidateData: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('candidates')
      .insert(candidateData)
      .select()
      .single()
    
    return { data, error }
  },

  async updateCandidate(candidateId: string, updates: Partial<Candidate>) {
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', candidateId)
      .select()
      .single()
    
    return { data, error }
  },

  async deleteCandidate(candidateId: string) {
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId)
    
    return { error }
  }
}

// =============================================
// INTERVIEWS SERVICE
// =============================================
export const interviewsService = {
  async getInterviews(companyId: string) {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        candidates (
          id,
          full_name,
          email
        ),
        jobs (
          id,
          title
        ),
        users!interviews_interviewer_id_fkey (
          full_name
        ),
        interview_reports (
          id,
          overall_score,
          recommendation
        )
      `)
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: false })
    
    return { data, error }
  },

  async getInterview(interviewId: string) {
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        candidates (
          id,
          full_name,
          email,
          resume_url
        ),
        jobs (
          id,
          title,
          description,
          ai_interview_config
        ),
        users!interviews_interviewer_id_fkey (
          full_name
        ),
        interview_reports (
          *
        )
      `)
      .eq('id', interviewId)
      .single()
    
    return { data, error }
  },

  async createInterview(interviewData: Omit<Interview, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('interviews')
      .insert(interviewData)
      .select()
      .single()
    
    return { data, error }
  },

  async updateInterview(interviewId: string, updates: Partial<Interview>) {
    const { data, error } = await supabase
      .from('interviews')
      .update(updates)
      .eq('id', interviewId)
      .select()
      .single()
    
    return { data, error }
  },

  async deleteInterview(interviewId: string) {
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', interviewId)
    
    return { error }
  }
}

// =============================================
// INTERVIEW REPORTS SERVICE
// =============================================
export const reportsService = {
  async getReports(companyId: string) {
    const { data, error } = await supabase
      .from('interview_reports')
      .select(`
        *,
        interviews (
          id,
          type,
          scheduled_at,
          completed_at
        ),
        candidates (
          id,
          full_name,
          email
        ),
        jobs (
          id,
          title
        ),
        users!interview_reports_reviewed_by_fkey (
          full_name
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async getReport(reportId: string) {
    const { data, error } = await supabase
      .from('interview_reports')
      .select(`
        *,
        interviews (
          id,
          type,
          scheduled_at,
          completed_at,
          duration_minutes,
          transcript
        ),
        candidates (
          id,
          full_name,
          email,
          resume_url
        ),
        jobs (
          id,
          title,
          description
        )
      `)
      .eq('id', reportId)
      .single()
    
    return { data, error }
  },

  async createReport(reportData: Omit<InterviewReport, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('interview_reports')
      .insert(reportData)
      .select()
      .single()
    
    return { data, error }
  },

  async updateReport(reportId: string, updates: Partial<InterviewReport>) {
    const { data, error } = await supabase
      .from('interview_reports')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single()
    
    return { data, error }
  }
}

// =============================================
// SUBSCRIPTIONS SERVICE
// =============================================
export const subscriptionsService = {
  async getSubscription(companyId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .single()
    
    return { data, error }
  },

  async updateSubscription(companyId: string, updates: Partial<Subscription>) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('company_id', companyId)
      .select()
      .single()
    
    return { data, error }
  },

  async createSubscription(subscriptionData: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single()
    
    return { data, error }
  }
}

// =============================================
// ANALYTICS SERVICE
// =============================================
export const analyticsService = {
  async logEvent(eventData: Omit<AnalyticsEvent, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('analytics_events')
      .insert(eventData)
      .select()
      .single()
    
    return { data, error }
  },

  async getAnalytics(companyId: string, startDate: string, endDate: string) {
    // Use the custom function we created in the schema
    const { data, error } = await supabase
      .rpc('get_company_analytics', {
        company_uuid: companyId,
        start_date: startDate,
        end_date: endDate
      })
    
    return { data, error }
  },

  async getDashboardStats(companyId: string) {
    // Get various counts for dashboard
    const [jobsResult, candidatesResult, interviewsResult, reportsResult] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact' }).eq('company_id', companyId),
      supabase.from('candidates').select('id', { count: 'exact' }).eq('company_id', companyId),
      supabase.from('interviews').select('id', { count: 'exact' }).eq('company_id', companyId),
      supabase.from('interview_reports').select('id, recommendation', { count: 'exact' }).eq('company_id', companyId)
    ])

    return {
      totalJobs: jobsResult.count || 0,
      totalCandidates: candidatesResult.count || 0,
      totalInterviews: interviewsResult.count || 0,
      totalReports: reportsResult.count || 0,
      hireRate: reportsResult.data ? 
        (reportsResult.data.filter(r => r.recommendation === 'hire').length / reportsResult.data.length * 100) : 0
    }
  }
}
