# 🚀 Complete Supabase Integration Guide

## 🎯 Overview

This guide provides everything you need to integrate Supabase with your AI Interview Management System. After following these steps, you'll have:

- ✅ Complete authentication system (signup, login, logout)
- ✅ Normalized relational database schema
- ✅ Row-level security (RLS) policies
- ✅ Type-safe database services
- ✅ Route protection middleware
- ✅ Multi-tenant architecture

---

## 📋 **Step 1: Supabase Project Setup**

### 1.1 Create Supabase Project

1. **Go to Supabase**: https://supabase.com/dashboard
2. **Click "New Project"**
3. **Fill in details**:
   - Organization: Select or create
   - Name: `interview-ai-system`
   - Database Password: Generate strong password
   - Region: Choose closest to your users
4. **Click "Create new project"**

### 1.2 Get Environment Variables

1. **Go to Settings → API**
2. **Copy these values**:
   ```bash
   Project URL: https://your-project-id.supabase.co
   Anon/Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 1.3 Create Environment File

Create `.env.local` in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
```

---

## 🗄️ **Step 2: Database Schema Setup**

### 2.1 Run SQL Schema

1. **Go to SQL Editor** in Supabase Dashboard
2. **Copy the entire `supabase-schema.sql` file content**
3. **Paste and Run** the script
4. **Verify tables created** in Table Editor

### 2.2 Verify Schema

Check these tables are created:
- `companies` - Company information
- `users` - User profiles (extends auth.users)
- `jobs` - Job postings
- `candidates` - Job applicants
- `interviews` - Interview sessions
- `interview_reports` - AI analysis results
- `subscriptions` - Billing and plans
- `analytics_events` - Usage tracking
- `company_settings` - Configuration

---

## 🔐 **Step 3: Authentication Setup**

### 3.1 Configure Auth Settings

1. **Go to Authentication → Settings**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**: Add these:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/dashboard
   ```

### 3.2 Email Templates (Optional)

1. **Go to Authentication → Email Templates**
2. **Customize** signup confirmation and password reset emails
3. **Update redirect URLs** to match your domain

---

## 🛠️ **Step 4: Code Integration**

All the necessary files have been created for you:

### 4.1 Core Files Created

```
lib/
├── supabase.ts           # Client configuration & types
├── supabase-server.ts    # Server-side client
contexts/
├── AuthContext.tsx       # Authentication context
app/
├── layout.tsx            # Updated with AuthProvider
├── auth/
│   ├── login/page.tsx    # Login page
│   └── signup/page.tsx   # Signup page
services/
├── database.ts           # Database service layer
middleware.ts             # Route protection
supabase-schema.sql       # Complete database schema
```

### 4.2 Update Your Dashboard

Update your existing dashboard to use the auth context:

```tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usersService } from '@/services/database'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    if (user) {
      loadUserProfile()
    }
  }, [user])

  const loadUserProfile = async () => {
    const { data } = await usersService.getUser(user.id)
    setUserProfile(data)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please sign in</div>
  }

  return (
    <div>
      <h1>Welcome, {userProfile?.full_name}!</h1>
      {/* Your existing dashboard content */}
    </div>
  )
}
```

---

## 🔧 **Step 5: Testing & Verification**

### 5.1 Test Authentication

1. **Start your app**: `npm run dev`
2. **Visit**: `http://localhost:3000`
3. **Should redirect** to login page
4. **Create account** via signup
5. **Check email** for verification
6. **Login** with credentials
7. **Should redirect** to dashboard

### 5.2 Test Database

```tsx
// Example: Test job creation
import { jobsService } from '@/services/database'

const createTestJob = async () => {
  const { data, error } = await jobsService.createJob({
    company_id: 'your-company-id',
    title: 'Frontend Developer',
    description: 'We are looking for...',
    location: 'Remote',
    requirements: ['React', 'TypeScript'],
    employment_type: 'full_time',
    status: 'active',
    ai_interview_config: {
      questions: ['Tell me about yourself'],
      evaluation_criteria: ['Communication'],
      duration_minutes: 30
    },
    created_by: 'user-id'
  })
  
  console.log('Job created:', data)
}
```

### 5.3 Verify RLS Policies

1. **Go to Authentication → Policies**
2. **Check all tables** have RLS enabled
3. **Test with different users** to ensure data isolation

---

## 📊 **Step 6: Using Database Services**

### 6.1 Jobs Management

```tsx
import { jobsService } from '@/services/database'

// Get all jobs for company
const { data: jobs } = await jobsService.getJobs(companyId)

// Create new job
const { data: newJob } = await jobsService.createJob(jobData)

// Update job
const { data: updatedJob } = await jobsService.updateJob(jobId, updates)
```

### 6.2 Candidates Management

```tsx
import { candidatesService } from '@/services/database'

// Get candidates with related data
const { data: candidates } = await candidatesService.getCandidates(companyId)

// Get candidate details
const { data: candidate } = await candidatesService.getCandidate(candidateId)
```

### 6.3 Analytics

```tsx
import { analyticsService } from '@/services/database'

// Get dashboard stats
const stats = await analyticsService.getDashboardStats(companyId)

// Log user event
await analyticsService.logEvent({
  company_id: companyId,
  user_id: userId,
  event_type: 'job_created',
  event_data: { job_id: newJobId }
})
```

---

## 🔒 **Step 7: Security Best Practices**

### 7.1 Row Level Security

- ✅ **Enabled on all tables**
- ✅ **Company-based data isolation**
- ✅ **Role-based access control**
- ✅ **User can only access their company data**

### 7.2 API Security

```tsx
// Always use authenticated requests
const { data } = await supabase
  .from('jobs')
  .select('*')
  // RLS automatically filters by user's company
```

### 7.3 Environment Variables

```bash
# Production - use different values
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
```

---

## 🚀 **Step 8: Production Deployment**

### 8.1 Update Supabase Settings

1. **Authentication → Settings**
2. **Update Site URL** to your production domain
3. **Add production redirect URLs**

### 8.2 Environment Variables

Set production environment variables in your deployment platform:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-key
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com
```

---

## 🎉 **You're Done!**

Your AI Interview Management System now has:

- ✅ **Complete Authentication** - Signup, login, logout
- ✅ **Secure Database** - Multi-tenant with RLS
- ✅ **Type-Safe Services** - Full TypeScript support
- ✅ **Route Protection** - Middleware-based security
- ✅ **Scalable Architecture** - Ready for production

### Next Steps:

1. **Integrate with your UI modules**
2. **Add AI interview features**
3. **Implement real-time subscriptions**
4. **Add file upload for resumes/recordings**
5. **Set up Stripe for billing**

Need help? Check the Supabase docs or create an issue! 🚀
