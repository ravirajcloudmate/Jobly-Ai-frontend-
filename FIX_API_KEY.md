# 🔑 How to Fix Your Supabase API Key

## Current Issue:
Your `.env.local` has an incomplete ANON_KEY:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma2lqYnJvaGNvZmxld25mcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2Nzg0NjYsImV4cCI6MjA2OTI1NDQ2Nn0.
```

**The key is cut off!** It should end with a signature part.

## Solution:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/ifkijbrohcoflewnfrnj

2. **Navigate to Settings → API**

3. **Copy the COMPLETE anon/public key** - it should look like:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma2lqYnJvaGNvZmxld25mcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2Nzg0NjYsImV4cCI6MjA2OTI1NDQ2Nn0.SIGNATURE_PART_HERE
   ```

4. **Also copy the Service Role Key** (needed for server operations)

## Update Your .env.local:

```bash
# Your Supabase Project
NEXT_PUBLIC_SUPABASE_URL=https://ifkijbrohcoflewnfrnj.supabase.co

# Complete ANON key (copy the full key from dashboard)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-complete-anon-key-with-signature

# Service Role key (copy from dashboard)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Add these for auth
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Quick Fix Command:
Delete your current .env.local and create a new one with complete keys from the dashboard.
