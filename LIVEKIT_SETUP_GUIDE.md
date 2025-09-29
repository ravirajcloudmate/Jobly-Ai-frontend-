# 🎯 LiveKit Interview Module Setup Guide

## 🚨 **Current Error**
```
Failed to get token: 500 Internal Server Error
```

This error occurs because **LiveKit environment variables are missing** from your `.env.local` file.

## 🔧 **Quick Fix**

### Step 1: Create `.env.local` File
Create a `.env.local` file in the `intrview-frontend` directory with this content:

```bash
# Supabase Configuration (Already Working)
NEXT_PUBLIC_SUPABASE_URL=https://ifkijbrohcoflewnfrnj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma2lqYnJvaGNvZmxld25mcm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2Nzg0NjYsImV4cCI6MjA2OTI1NDQ2Nn0.no8PdNaBHlPmYNPT9TfwBVMfjPc_QU6UiKbBwS06FtM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlma2lqYnJvaGNvZmxld25mcm5qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY3ODQ2NiwiZXhwIjoyMDY5MjU0NDY2fQ.RxgiGKiYszKMsB

# LiveKit Configuration (REQUIRED - You need to set these)
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Optional Auth Configuration
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000
```

### Step 2: Set Up LiveKit

#### **Option A: LiveKit Cloud (Recommended - FREE)**
1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a free account
3. Create a new project
4. Copy your project credentials:
   - **Server URL**: `wss://your-project.livekit.cloud`
   - **API Key**: Your project API key
   - **API Secret**: Your project API secret
5. Replace the LiveKit values in your `.env.local` file

#### **Option B: Local LiveKit Server (For Development)**
1. Install Docker (if not already installed)
2. Run this command:
   ```bash
   docker run --rm -p 7880:7880 -p 7881:7881 livekit/livekit-server --dev
   ```
3. Use these values in your `.env.local`:
   ```bash
   LIVEKIT_URL=ws://localhost:7880
   LIVEKIT_API_KEY=devkey
   LIVEKIT_API_SECRET=secret
   ```

### Step 3: Restart Development Server
```bash
npm run dev
```

## ✅ **What You'll Get After Setup**

### 🎥 **Modern Interview Live Module Features:**
- **Real-time Video/Audio**: High-quality video conferencing
- **Agent Connection Status**: Visual indicators when agent connects
- **Audio Controls**: Volume slider, mute/unmute, device selection
- **Chat Panel**: Optional side panel for text communication
- **Connection Quality**: Real-time connection quality indicators
- **Error Handling**: Comprehensive error messages and recovery
- **Professional UI**: Clean, modern interface with dark/light mode support

### 🎨 **UI Components:**
- **Video Conference**: Centered video display with overlays
- **Status Badges**: Connection and quality indicators
- **Audio Controls Panel**: Expandable settings with device management
- **Chat Interface**: Scrollable chat with timestamps
- **Loading States**: Professional loading screens and spinners
- **Error Screens**: User-friendly error messages with retry options

## 🧪 **Testing the Interview Module**

1. **Navigate to `/interview`** in your browser
2. **You should see:**
   - Modern interview UI instead of error
   - "Preparing Interview" loading screen
   - Video conference interface
   - Audio controls and chat panel
3. **If you see the error screen:**
   - Check your `.env.local` file has the correct LiveKit values
   - Ensure your LiveKit server is running
   - Restart your development server

## 🔍 **Troubleshooting**

### Error: "LiveKit environment variables not configured"
- **Solution**: Make sure all three LiveKit variables are set in `.env.local`
- **Check**: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`

### Error: "Connection failed" or "Token error"
- **Solution**: Verify your LiveKit credentials are correct
- **Check**: Your LiveKit Cloud project is active
- **Check**: Local server is running (if using local setup)

### Video not loading
- **Solution**: Check browser permissions for camera/microphone
- **Check**: HTTPS is required for camera access in production

## 📚 **Additional Resources**

- [LiveKit Cloud Documentation](https://docs.livekit.io/cloud/)
- [LiveKit React Components](https://docs.livekit.io/client-sdk-react/)
- [LiveKit Server Setup](https://docs.livekit.io/server/)

## 🎯 **Next Steps**

Once LiveKit is configured:
1. **Test the interview module** at `/interview`
2. **Customize the UI** to match your brand
3. **Add more features** like screen sharing, recording, etc.
4. **Deploy to production** with proper HTTPS setup

---

**Need Help?** Check the `setup-env.md` file for more detailed environment setup instructions.
