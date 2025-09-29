# 🔑 Fix Invalid API Key Error

## The Problem
You're getting "Invalid API key" error because your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is incomplete.

## Current Issue
Your current key ends with `RxgiGKiYszKMsB` but it should be much longer (around 200+ characters).

## Solution - Get Complete API Key

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/ifkijbrohcoflewnfrnj/settings/api
2. Login to your Supabase account

### Step 2: Copy the Complete ANON Key
1. In the API settings page, find "Project API keys"
2. Copy the **complete** `anon public` key
3. It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma2lqYnJvaGNvZmxld25mcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2Nzg0NjYsImV4cCI6MjA2OTI1NDQ2Nn0.YOUR_COMPLETE_SIGNATURE_HERE`

### Step 3: Update .env.local File
Replace your current `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ifkijbrohcoflewnfrnj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_COMPLETE_ANON_KEY_FROM_DASHBOARD
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_FROM_DASHBOARD
```

### Step 4: Restart Development Server
```bash
npm run dev
```

## Quick Test
After updating, visit: http://localhost:3000/test-config
- Should show "✅ Properly Configured"
- No more "Invalid API key" errors

## Why This Happens
- JWT tokens have 3 parts: header.payload.signature
- Your current key is missing the signature part
- Supabase validates the complete token structure
