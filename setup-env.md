# 🚨 URGENT: Environment Setup Required

## The Problem
Your app is showing only the logout option because the **Supabase environment variables are missing**. The app cannot connect to your database for authentication.

## LiveKit Interview Module Error
The interview live module is failing with "Failed to get token: 500 Internal Server Error" because **LiveKit environment variables are missing**.

## Quick Fix

1. **Create a `.env.local` file** in the `intrview-frontend` directory with this content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ifkijbrohcoflewnfrnj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma2lqYnJvaGNvZmxld25mcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2Nzg0NjYsImV4cCI6MjA2OTI1NDQ2Nn0.no8PdNaBHlPmYNPT9TfwBVMfjPc_QU6UiKbBwS06FtM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma2lqYnJvaGNvZmxld25mcm5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3ODQ2NiwiZXhwIjoyMDY5MjU0NDY2fQ.RxgiGKiYszKMsB

# LiveKit Configuration (REQUIRED for Interview Module)
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Auth (Optional)
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000
```

2. **Get the complete keys from Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/ifkijbrohcoflewnfrnj/settings/api
   - Copy the **complete** ANON key (the current one is cut off)
   - Copy the SERVICE ROLE key

3. **Set up LiveKit for Interview Module**:
   
   **Option A: Use LiveKit Cloud (Recommended)**
   - Go to: https://cloud.livekit.io/
   - Create a free account and project
   - Copy your project's URL, API Key, and API Secret
   - Replace the LiveKit values in `.env.local`:
     ```
     LIVEKIT_URL=wss://your-project.livekit.cloud
     LIVEKIT_API_KEY=your-project-api-key
     LIVEKIT_API_SECRET=your-project-api-secret
     ```

   **Option B: Use Local LiveKit Server**
   - Install LiveKit server locally
   - Run: `docker run --rm -p 7880:7880 -p 7881:7881 livekit/livekit-server --dev`
   - Use these values in `.env.local`:
     ```
     LIVEKIT_URL=ws://localhost:7880
     LIVEKIT_API_KEY=devkey
     LIVEKIT_API_SECRET=secret
     ```

4. **Restart your development server**:
   ```bash
   npm run dev
   ```

## What's Happening
- The app tries to connect to Supabase for authentication
- Without proper environment variables, authentication fails
- The app shows logout loader instead of login/dashboard
- The interview module fails because LiveKit token generation requires API credentials
- This is why you see "Failed to get token: 500 Internal Server Error"

## After Setup
Once you have the correct environment variables, the app will:
- Show login page when not authenticated
- Show dashboard when authenticated
- Work properly with all features
- **Interview module will work with live video/audio calls**
- **LiveKit token generation will succeed**

## Quick Test
After setting up LiveKit, you can test the interview module by:
1. Going to `/interview` in your browser
2. You should see the modern interview UI instead of the error
3. The video conference should initialize properly
