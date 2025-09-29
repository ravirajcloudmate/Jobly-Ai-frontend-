# 🔧 आपके Backend को Integrate करने के लिए

## 📋 आपके Backend में यह API Endpoint बनाएं:

### **POST `/start-interview`**

```python
# Python FastAPI Example
from fastapi import FastAPI, HTTPException
import asyncio
from livekit import rtc
import json

app = FastAPI()

@app.post("/start-interview")
async def start_interview(request_data: dict):
    try:
        room_name = request_data["roomName"]
        agent_token = request_data["agentToken"]
        candidate_id = request_data["candidateId"]
        job_id = request_data["jobId"]
        
        # LiveKit credentials
        livekit_url = request_data["livekitUrl"]
        livekit_api_key = request_data["livekitApiKey"]
        livekit_api_secret = request_data["livekitApiSecret"]
        
        # आपका AI Agent यहाँ join करेगा
        await connect_ai_agent(room_name, agent_token, candidate_id, job_id)
        
        return {
            "success": True,
            "message": "AI agent started successfully",
            "roomName": room_name,
            "candidateId": candidate_id,
            "jobId": job_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def connect_ai_agent(room_name: str, token: str, candidate_id: str, job_id: str):
    # LiveKit room में connect करें
    room = rtc.Room()
    
    # Room में join करें
    await room.connect(livekit_url, token)
    
    # Video/Audio enable करें
    await room.local_participant.set_microphone_enabled(True)
    await room.local_participant.set_camera_enabled(True)
    
    # Interview start करें
    await conduct_interview(room, candidate_id, job_id)

async def conduct_interview(room: rtc.Room, candidate_id: str, job_id: str):
    # आपकी interview logic यहाँ आएगी
    questions = get_interview_questions(job_id)
    
    for question in questions:
        # Question ask करें
        await ask_question(room, question)
        
        # Candidate का response wait करें
        response = await wait_for_response(room)
        
        # AI analysis करें
        analysis = analyze_response(question, response)
        
        # Feedback दें
        await provide_feedback(room, analysis)

def get_interview_questions(job_id: str):
    # आपके database से questions fetch करें
    return [
        "Tell me about yourself",
        "Why do you want this job?",
        "What are your strengths?"
    ]

async def ask_question(room: rtc.Room, question: str):
    # Question को data channel के through भेजें
    await room.local_participant.publish_data(
        json.dumps({
            "type": "question",
            "question": question,
            "timestamp": time.time()
        }).encode()
    )
    
    # Audio में भी speak करें
    await speak_question(question)

def analyze_response(question: str, response: str):
    # आपका AI model यहाँ response analyze करेगा
    return {
        "score": 8.5,
        "feedback": "Good answer, but could be more specific",
        "keywords": ["experience", "skills", "passion"]
    }
```

## 🔧 Node.js/Express Example:

```javascript
// Express.js Backend
const express = require('express');
const { Room, RoomEvent } = require('livekit-server-sdk');

const app = express();
app.use(express.json());

app.post('/start-interview', async (req, res) => {
  try {
    const { roomName, agentToken, candidateId, jobId, livekitUrl } = req.body;
    
    // AI Agent को room में join कराएं
    const room = new Room(livekitUrl, agentToken);
    await room.connect();
    
    // Interview start करें
    await startAIIterview(room, candidateId, jobId);
    
    res.json({
      success: true,
      message: "AI agent started successfully",
      roomName,
      candidateId,
      jobId
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function startAIIterview(room, candidateId, jobId) {
  // आपकी AI interview logic यहाँ
  const questions = await getInterviewQuestions(jobId);
  
  for (const question of questions) {
    await askQuestion(room, question);
    const response = await waitForResponse(room);
    const analysis = await analyzeResponse(question, response);
    await provideFeedback(room, analysis);
  }
}

app.listen(8000, () => {
  console.log('Backend AI service running on port 8000');
});
```

## 📝 Environment Variables:

आपके `.env.local` में ये add करें:

```bash
# Backend Integration
BACKEND_URL=http://localhost:8000
BACKEND_API_KEY=your-backend-api-key

# या production में:
BACKEND_URL=https://your-backend-domain.com
BACKEND_API_KEY=your-production-api-key
```

## 🚀 Integration Steps:

1. **आपका Backend Start करें** (port 8000 पर)
2. **Environment Variables Set करें** (आपके actual backend URL के साथ)
3. **Interview Page Test करें**: `http://localhost:3000/interview`
4. **Console में देखें** कि backend call हो रहा है या नहीं

## 🔍 Testing:

```bash
# Terminal में देखें:
🤖 Triggering AI agent to join interview room: interview-candidate-123
✅ Agent service started: AI agent started successfully
🤖 AI Agent connected successfully!
```

## 📞 आपके Backend को Call करने के लिए:

Frontend automatically आपके backend को call करेगा जब:
- Candidate interview room में join करता है
- System automatically `/start-interview` endpoint को call करता है
- आपका AI agent LiveKit room में join हो जाता है

**बस आपको अपने backend में यह endpoint बनाना है और environment variables set करने हैं!**

