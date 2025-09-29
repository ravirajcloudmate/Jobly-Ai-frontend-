# 🤖 Backend AI Agent Integration Guide

This guide explains how to integrate your backend AI interview agent with the Live Interview Module.

## 🏗️ Architecture Overview

```
Frontend (Next.js) ←→ LiveKit Server ←→ Backend AI Agent
     ↓                    ↓                    ↓
Interview UI          Video/Audio         AI Logic & Questions
```

## 📋 Current Implementation

The frontend now includes:

1. **Interview Session Management** (`/api/start-interview`)
2. **Agent Status Monitoring** (`/api/agent-status`) 
3. **Agent Service Integration** (`/api/agent-service`)
4. **Real-time Agent Status UI**

## 🔧 Backend Integration Steps

### Step 1: Replace Agent Service Call

In `app/api/start-interview/route.ts`, replace the simulated agent service call with your actual backend:

```typescript
// Replace this simulation:
const agentResponse = await fetch(`${req.nextUrl.origin}/api/agent-service`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roomName, agentToken, candidateId, jobId })
});

// With your actual backend call:
const agentResponse = await fetch('http://your-backend-url/start-interview', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
  },
  body: JSON.stringify({ 
    roomName, 
    agentToken, 
    candidateId, 
    jobId,
    livekitUrl: process.env.LIVEKIT_URL,
    livekitApiKey: process.env.LIVEKIT_API_KEY,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET
  })
});
```

### Step 2: Backend Agent Implementation

Your backend AI agent should:

1. **Connect to LiveKit Room** using the provided credentials
2. **Join as Agent** with identity starting with `interview-agent`
3. **Start Video/Audio Streams**
4. **Conduct Interview** by asking questions
5. **Process Candidate Responses**
6. **Generate Real-time Feedback**

#### Example Backend Agent (Python):

```python
import asyncio
import json
from livekit import rtc, agents
from livekit.agents import AutoSubscribe

class InterviewAgent:
    def __init__(self, room_url, token):
        self.room_url = room_url
        self.token = token
        self.room = rtc.Room()
        
    async def start_interview(self, candidate_id, job_id):
        # Connect to LiveKit room
        await self.room.connect(self.room_url, self.token)
        
        # Set up event handlers
        self.room.on("participant_connected", self.on_participant_connected)
        self.room.on("data_received", self.on_data_received)
        
        # Start video and audio
        await self.room.local_participant.set_microphone_enabled(True)
        await self.room.local_participant.set_camera_enabled(True)
        
        # Begin interview
        await self.conduct_interview(candidate_id, job_id)
    
    async def conduct_interview(self, candidate_id, job_id):
        questions = self.get_interview_questions(job_id)
        
        for question in questions:
            # Ask question
            await self.ask_question(question)
            
            # Wait for candidate response
            response = await self.wait_for_response()
            
            # Process response with AI
            analysis = await self.analyze_response(question, response)
            
            # Provide feedback
            await self.provide_feedback(analysis)
    
    async def ask_question(self, question):
        # Send question via data channel or audio
        await self.room.local_participant.publish_data(
            json.dumps({
                "type": "question",
                "question": question,
                "timestamp": time.time()
            }).encode()
        )
        
        # Also speak the question
        await self.speak(question)
```

### Step 3: Environment Variables

Add these to your `.env.local`:

```bash
# Backend Integration
BACKEND_API_URL=http://your-backend-url
BACKEND_API_KEY=your-backend-api-key

# LiveKit (already configured)
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

### Step 4: Real-time Communication

The frontend monitors agent status every 3 seconds. Your backend should:

1. **Join with Agent Identity**: Use identity starting with `interview-agent`
2. **Send Status Updates**: Use LiveKit data channels
3. **Handle Interview Flow**: Manage question-answer cycles
4. **Provide Real-time Feedback**: Update UI through LiveKit events

## 🎯 Interview Flow

1. **Candidate Joins** → Frontend calls `/api/start-interview`
2. **Agent Triggered** → Backend receives agent join request
3. **Agent Connects** → Backend AI agent joins LiveKit room
4. **Interview Begins** → Agent starts asking questions
5. **Real-time Interaction** → Questions, answers, feedback
6. **Interview Complete** → Generate final report

## 🔍 Testing the Integration

1. **Start Development Server**: `npm run dev`
2. **Navigate to Interview**: `http://localhost:3000/interview`
3. **Check Console Logs**: Look for agent connection messages
4. **Monitor Agent Status**: Watch the agent status indicator
5. **Test Backend Integration**: Replace simulation with real backend

## 📊 API Endpoints

### POST `/api/start-interview`
```json
{
  "roomName": "interview-candidate-123",
  "candidateId": "candidate-123",
  "jobId": "job-456"
}
```

### GET `/api/agent-status?room=interview-candidate-123`
```json
{
  "status": "success",
  "agentConnected": true,
  "participants": [...],
  "roomMetadata": {...}
}
```

## 🚀 Next Steps

1. **Implement Backend Agent**: Create your AI interview agent
2. **Replace Simulation**: Update API calls to use real backend
3. **Add Interview Logic**: Implement question-answer flow
4. **Integrate AI Models**: Connect your AI/ML models
5. **Add Reporting**: Generate interview reports
6. **Test End-to-End**: Verify complete interview flow

## 🛠️ Troubleshooting

- **Agent Not Connecting**: Check LiveKit credentials and network
- **Status Not Updating**: Verify agent joins with correct identity
- **Backend Errors**: Check API endpoints and authentication
- **Video Issues**: Ensure camera/microphone permissions

The frontend is now ready to integrate with your backend AI agent. The simulation will show the expected behavior, and you can replace it with your actual backend implementation.

