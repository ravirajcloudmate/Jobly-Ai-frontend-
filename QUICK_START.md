# 🔧 Quick Setup Instructions

## Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details
4. Wait for project to be ready

## Step 2: Set Environment Variables

Create `.env.local` file in your project root:

```bash
# Copy these from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Generate this: openssl rand -base64 32
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## Step 3: Run Database Schema

1. Go to Supabase Dashboard > SQL Editor
2. Copy all content from `supabase-schema.sql`
3. Paste and run the SQL script
4. Verify tables are created in Table Editor

## Step 4: Test Your App

```bash
npm run dev
```

Visit http://localhost:3000 - you should be redirected to login page!

## Step 5: Create Your First Account

1. Click "Sign up" 
2. Fill in your details
3. Check email for verification (if not in demo mode)
4. Login and start using the app!

---

## ✅ What's Working Now:

- ✅ **Authentication** - Signup, Login, Logout
- ✅ **Route Protection** - Automatic redirects
- ✅ **Database Integration** - Real data storage
- ✅ **Multi-tenant** - Company-based data isolation
- ✅ **Job Management** - Create, read, update, delete jobs
- ✅ **User Profiles** - Automatic profile creation

## 🚧 Next Steps:

1. **Add more real data integration** to other components
2. **Test job creation** and management
3. **Add candidate management** 
4. **Implement interview scheduling**

Need help? Check the full guide in `SUPABASE_INTEGRATION_GUIDE.md`!
