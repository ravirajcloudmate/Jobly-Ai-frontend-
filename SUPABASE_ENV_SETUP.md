# 🔐 Environment Variables Setup

## Required Supabase Variables

Add these to your `.env.local` file:

```bash
# Supabase Configuration
# Get these from https://supabase.com/dashboard/project/[your-project]/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3000
```

## How to Get Supabase Credentials:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Create New Project** or select existing project
3. **Go to Settings → API**
4. **Copy these values**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon/Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

## Generate NextAuth Secret:

```bash
openssl rand -base64 32
```

Or use: https://generate-secret.vercel.app/32
