# 🐍 Python Backend Setup Guide

## 📋 Step-by-Step Setup

### **Step 1: Python Backend को Setup करें**

```bash
# 1. Python virtual environment बनाएं
python -m venv interview-backend
cd interview-backend

# 2. Activate करें (Windows)
.\Scripts\activate

# 3. Dependencies install करें
pip install -r requirements.txt

# 4. Backend को run करें
python PYTHON_BACKEND_INTEGRATION.py
```

### **Step 2: Environment Variables Update करें**

आपके `.env.local` में ये values set करें:

```bash
# Backend Integration
BACKEND_URL=http://localhost:8000
BACKEND_API_KEY=your-backend-api-key  # आप अपना API key set करें
```

### **Step 3: Test करें**

1. **Backend Start करें**: `python PYTHON_BACKEND_INTEGRATION.py`
2. **Frontend Start करें**: `npm run dev`
3. **Interview Page पर जाएं**: `http://localhost:3000/interview`

## 🔧 आपके Backend में Customize करने के लिए:

### **1. Interview Questions Add करें**
```python
async def load_interview_questions(self, job_id: str):
    # आपके database से questions fetch करें
    questions = [
        "Tell me about yourself",
        "Why do you want this job?",
        "What are your strengths?",
        # आपके custom questions यहाँ add करें
    ]
    return questions
```

### **2. AI Analysis Add करें**
```python
async def analyze_response(self, question: str, response: str):
    # आपका AI model यहाँ integrate करें
    # Example: OpenAI, Hugging Face, या कोई भी AI service
    
    analysis = {
        "score": 8.5,
        "feedback": "Good response",
        "keywords": ["experience", "skills"],
        "sentiment": "positive"
    }
    return analysis
```

### **3. Speech-to-Text Add करें**
```python
async def wait_for_response(self, timeout: int = 60):
    # Speech-to-Text service integrate करें
    # Example: Google Speech-to-Text, Azure Speech, etc.
    
    # For now, mock response
    return f"Mock response to: {self.current_question}"
```

## 🚀 Production Setup:

### **1. Environment Variables (Production)**
```bash
BACKEND_URL=https://your-backend-domain.com
BACKEND_API_KEY=your-production-api-key
```

### **2. Backend को Deploy करें**
```bash
# Docker के साथ
docker build -t interview-backend .
docker run -p 8000:8000 interview-backend

# या Heroku, AWS, DigitalOcean पर deploy करें
```

## 📊 API Endpoints:

### **Frontend से Call होने वाले:**
- `POST /start-interview` - Interview start करने के लिए
- `GET /interview-status/{candidate_id}` - Status check करने के लिए
- `DELETE /end-interview/{candidate_id}` - Interview end करने के लिए

### **Health Check:**
- `GET /health` - Backend health check

## 🔍 Testing Commands:

```bash
# Backend health check
curl http://localhost:8000/health

# Interview start करने के लिए
curl -X POST http://localhost:8000/start-interview \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "test-room",
    "agentToken": "test-token",
    "candidateId": "test-candidate",
    "jobId": "test-job"
  }'
```

## 📝 Console में देखने वाले Messages:

```bash
🚀 Starting AI Interview Agent Backend...
🤖 AI Agent connecting to room: interview-candidate-123
✅ AI Agent connected successfully!
🎯 Starting interview with 6 questions
❓ Asking question 1/6: Tell me about yourself
👂 Listening for candidate response...
🧠 Analyzing response...
💬 Feedback sent: Great answer! Score: 8.5/10
```

## ⚡ Quick Start:

1. **Backend को copy करें**: `PYTHON_BACKEND_INTEGRATION.py` को अपने backend folder में copy करें
2. **Dependencies install करें**: `pip install -r requirements.txt`
3. **Backend run करें**: `python PYTHON_BACKEND_INTEGRATION.py`
4. **Frontend test करें**: Interview page पर जाकर test करें

**आपका AI Interview Agent तैयार है! 🎉**

