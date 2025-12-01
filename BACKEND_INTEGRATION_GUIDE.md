# 🚀 Backend Integration Guide for Interview Performance Tracking

## Overview
Yeh document aapko batayega ki interview ke dauran candidate ki performance track karne aur analytics save karne ke liye backend me kya changes chahiye.

---

## 📊 Features Implemented (Frontend)

### 1. **Live Interview Tracking**
- Interview room me real-time Q&A tracking
- Questions asked count
- Answers received count
- Performance metrics calculation

### 2. **Performance Analysis**
- Correct answers tracking
- Wrong answers tracking
- Partial answers tracking
- Overall score calculation
- Strengths & weaknesses identification

### 3. **Analytics Dashboard**
- Complete interview reports display
- Candidate performance metrics
- Visual charts and graphs
- Recommendations and insights

---

## 🔧 Backend Requirements

### Database Table Created
**Table:** `interview_reports`

Migration file already created at:
```
supabase/migrations/create_interview_reports.sql
```

**Run this migration in Supabase:**
```bash
# Run migration in Supabase dashboard SQL editor
# or use Supabase CLI
supabase db push
```

---

## 🎯 Backend API Endpoints Required

### 1. **Answer Evaluation Endpoint** (CRITICAL)

Backend ko candidate ke answers analyze karne ke liye yeh endpoint banana hai:

**Endpoint:** `POST /api/evaluate-answer` ya `/evaluate-response`

**Purpose:** Jab candidate answer de, toh AI agent usko analyze kare aur evaluation return kare

**Request Body:**
```json
{
  "room_id": "room_123",
  "question": "Explain SOLID principles",
  "answer": "SOLID stands for...",
  "candidate_id": "candidate@email.com",
  "question_number": 3,
  "expected_keywords": ["Single Responsibility", "Open/Closed", "Liskov"],
  "difficulty_level": "medium"
}
```

**Response Format:**
```json
{
  "is_correct": true,
  "is_partial": false,
  "score": 8.5,
  "evaluation": {
    "accuracy": 85,
    "completeness": 90,
    "relevance": 80,
    "confidence": "high"
  },
  "feedback": "Good explanation with examples",
  "keywords_matched": ["Single Responsibility", "Open/Closed"],
  "keywords_missed": ["Liskov"],
  "strengths": ["Clear explanation", "Used examples"],
  "improvements": ["Could add more details on Liskov principle"]
}
```

**Frontend Integration:**
```javascript
// Frontend already expects this data format
// When your backend sends 'answer_evaluation' or 'response_analysis' message:
{
  "type": "answer_evaluation",
  "evaluation": {
    "is_correct": true,
    "is_partial": false,
    "score": 8.5
  }
}
```

---

### 2. **Interview Completion Data** (CRITICAL)

Jab interview complete ho, backend ko yeh data send karna chahiye:

**Data Channel Message Type:** `interview_complete` or `interview_completed`

**Message Format:**
```json
{
  "type": "interview_complete",
  "score": 78.5,
  "performance": {
    "total_score": 78.5,
    "correct_answers": 7,
    "wrong_answers": 2,
    "partial_answers": 1,
    "strengths": [
      "Strong communication skills",
      "Good technical knowledge",
      "Clear explanations"
    ],
    "weaknesses": [
      "Could improve on system design",
      "Needs more practice with algorithms"
    ],
    "recommendation": "Recommend for next round. Candidate shows good potential."
  },
  "analysis": {
    "communication_score": 85,
    "technical_score": 75,
    "confidence_level": 80,
    "response_quality": 82
  }
}
```

---

### 3. **Real-time Question Analysis** (OPTIONAL but RECOMMENDED)

Har question ke baad immediate feedback:

**Message Type:** `response_analysis`

**Format:**
```json
{
  "type": "response_analysis",
  "analysis": {
    "is_correct": true,
    "is_partial": false,
    "score": 8,
    "feedback": "Excellent answer with practical examples"
  }
}
```

---

## 🔄 Backend Data Flow

```
1. Interview Starts
   ↓
2. Agent asks Question
   ↓
3. Candidate answers
   ↓
4. Backend receives answer → Analyze with AI/LLM
   ↓
5. Send evaluation back to frontend
   {
     type: "answer_evaluation",
     evaluation: { is_correct, score, feedback }
   }
   ↓
6. Frontend updates performance metrics
   ↓
7. Repeat steps 2-6 for all questions
   ↓
8. Interview Ends
   ↓
9. Backend sends final analysis
   {
     type: "interview_complete",
     score: 78.5,
     performance: { ... }
   }
   ↓
10. Frontend saves report to database
```

---

## 💡 Backend Implementation Tips

### Option 1: Using OpenAI/LLM for Evaluation

```python
# Python Backend Example
async def evaluate_answer(question: str, answer: str, expected_topics: list):
    prompt = f"""
    Evaluate this interview answer:
    
    Question: {question}
    Answer: {answer}
    Expected Topics: {', '.join(expected_topics)}
    
    Provide evaluation in JSON format:
    {{
      "is_correct": true/false,
      "score": 0-10,
      "accuracy": 0-100,
      "feedback": "Brief feedback",
      "strengths": ["strength1", "strength2"],
      "improvements": ["improvement1"]
    }}
    """
    
    # Call OpenAI or your LLM
    response = await llm.complete(prompt)
    return response.json()
```

### Option 2: Keyword Matching + Scoring

```python
async def evaluate_answer_simple(question: str, answer: str, keywords: list):
    score = 0
    matched = []
    
    for keyword in keywords:
        if keyword.lower() in answer.lower():
            score += 10 / len(keywords)
            matched.append(keyword)
    
    is_correct = score >= 6  # 60% threshold
    
    return {
        "is_correct": is_correct,
        "score": round(score, 1),
        "keywords_matched": matched,
        "keywords_missed": [k for k in keywords if k not in matched]
    }
```

---

## 📡 LiveKit Data Channel Integration

**Backend se Frontend ko message send karne ka tarika:**

```python
from livekit import rtc

async def send_evaluation_to_frontend(room: rtc.Room, evaluation_data: dict):
    """Send evaluation data to frontend via LiveKit data channel"""
    
    message = {
        "type": "answer_evaluation",
        "evaluation": evaluation_data,
        "timestamp": datetime.now().isoformat()
    }
    
    # Send to all participants
    await room.local_participant.publish_data(
        json.dumps(message).encode('utf-8'),
        reliable=True
    )
```

---

## 🎨 Customization Options

### Adjust Scoring Logic

Frontend me yeh fields automatically calculate hote hain agar backend data na mile:

```typescript
// You can override these by sending data from backend
performance_metrics: {
  response_rate: 90,        // % of questions answered
  accuracy: 80,             // % of correct answers
  communication_score: 85,  // AI-evaluated
  technical_score: 75,      // AI-evaluated
  confidence_level: 80      // AI-evaluated
}
```

---

## ✅ Testing Checklist

Backend ready hai ya nahi, yeh check karein:

- [ ] `/evaluate-answer` endpoint ready hai
- [ ] Answer evaluation AI/logic implemented hai
- [ ] LiveKit data channel se messages send ho rahe hain
- [ ] `answer_evaluation` message type send hota hai
- [ ] `interview_complete` message final data ke saath send hota hai
- [ ] Performance metrics calculate hote hain (strengths, weaknesses)
- [ ] Transcript backend me save ho rahi hai (optional)

---

## 🚀 Quick Start Integration

### Step 1: Database Setup
```sql
-- Run the migration file
\i supabase/migrations/create_interview_reports.sql
```

### Step 2: Backend Endpoints
```python
# Add these endpoints in your Python backend

@app.post("/evaluate-answer")
async def evaluate_answer(request: AnswerRequest):
    # Your evaluation logic here
    evaluation = await analyze_with_ai(
        question=request.question,
        answer=request.answer
    )
    
    # Send to LiveKit room
    await send_to_room(request.room_id, {
        "type": "answer_evaluation",
        "evaluation": evaluation
    })
    
    return {"success": True, "evaluation": evaluation}

@app.post("/complete-interview")
async def complete_interview(request: CompleteRequest):
    # Calculate final scores
    final_data = calculate_final_performance(request.room_id)
    
    # Send to LiveKit room
    await send_to_room(request.room_id, {
        "type": "interview_complete",
        "score": final_data.total_score,
        "performance": final_data
    })
    
    return {"success": True}
```

### Step 3: Test
```bash
# Start interview
# Answer questions
# Check Analytics → Reports tab
# Verify data is saved
```

---

## 📞 Support

Agar koi problem aaye backend integration me:

1. Check LiveKit data channel messages (browser console)
2. Verify backend endpoints are responding
3. Check database migration ran successfully
4. Test with sample data first

---

## 🎯 Final Notes

**Frontend Already Implemented:**
✅ Real-time tracking
✅ Performance calculations
✅ Report saving
✅ Analytics display
✅ Database integration

**Backend To-Do:**
⏳ Answer evaluation API
⏳ AI/LLM integration for analysis
⏳ LiveKit message sending
⏳ Performance metrics calculation

**Database:**
✅ Migration file ready
✅ API endpoints created
✅ Frontend integrated

Bas backend me evaluation logic add kar do aur LiveKit se messages send kar do! 🚀


