# LiveKit API cURL Examples

## Base URL
```
http://localhost:3000/api/v1/live-kit
```
या production में:
```
https://yourdomain.com/api/v1/live-kit
```

---

## 1. List All LiveKit Sessions

सभी sessions को list करने के लिए:

```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?list_sessions=true&project_id=p_your_project_id" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "source": "livekit_cloud_api",
  "sessions": [...],
  "count": 10
}
```

---

## 2. Get Specific LiveKit Session Details

किसी specific session की details fetch करने के लिए:

```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?livekit_session_id=your_livekit_session_id&project_id=p_your_project_id" \
  -H "Content-Type: application/json"
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?livekit_session_id=SE_abc123xyz&project_id=p_proj_123" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "source": "livekit_cloud_api",
  "session": {
    "id": "SE_abc123xyz",
    "room_name": "room_123",
    ...
  }
}
```

---

## 3. Get Transcript by Session ID (Database)

Database से transcript fetch करने के लिए (original functionality):

```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?session_id=your_database_session_id" \
  -H "Content-Type: application/json"
```

**Example:**
```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?session_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "room_id": "room_123",
  "transcript": [
    {
      "speaker": "agent",
      "text": "Hello, how are you?",
      "timestamp": "2024-01-01T10:00:00Z"
    },
    {
      "speaker": "candidate",
      "text": "I'm doing well, thank you!",
      "timestamp": "2024-01-01T10:00:05Z"
    }
  ],
  "metadata": {
    "candidate_name": "John Doe",
    "candidate_email": "john@example.com",
    "started_at": "2024-01-01T10:00:00Z",
    "ended_at": "2024-01-01T10:30:00Z",
    "duration_seconds": 1800,
    "status": "completed"
  }
}
```

---

## 4. POST Webhook (LiveKit से आने वाला)

LiveKit webhook receive करने के लिए (यह LiveKit server से automatically call होगा):

```bash
curl -X POST "http://localhost:3000/api/v1/live-kit" \
  -H "Content-Type: application/webhook+json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_JWT_TOKEN" \
  -d '{
    "event": "room_started",
    "room": {
      "sid": "RM_abc123",
      "name": "room_123"
    }
  }'
```

**Note:** यह endpoint LiveKit server से automatically call होता है, manually test करने के लिए proper JWT token की जरूरत होगी।

---

## Complete Examples with All Parameters

### List Sessions with Custom Limit
```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?list_sessions=true&project_id=p_your_project_id" \
  -H "Content-Type: application/json" \
  -v
```

### Get Session with Environment Variable
अगर `LIVEKIT_PROJECT_ID` environment variable set है:
```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?livekit_session_id=SE_abc123" \
  -H "Content-Type: application/json"
```

### Pretty Print JSON Response
```bash
curl -X GET "http://localhost:3000/api/v1/live-kit?session_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" | jq .
```

---

## PowerShell Examples (Windows)

### List Sessions
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/live-kit?list_sessions=true&project_id=p_your_project_id" -Method Get -ContentType "application/json"
```

### Get Session Details
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/live-kit?livekit_session_id=SE_abc123&project_id=p_your_project_id" -Method Get -ContentType "application/json"
```

### Get Transcript
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/live-kit?session_id=550e8400-e29b-41d4-a716-446655440000" -Method Get -ContentType "application/json"
```

---

## Error Responses

### Missing Parameters
```json
{
  "success": false,
  "message": "session_id, livekit_session_id, or list_sessions query parameter is required"
}
```

### Session Not Found
```json
{
  "success": false,
  "message": "Session not found"
}
```

### Missing Project ID
```json
{
  "success": false,
  "message": "project_id query parameter or LIVEKIT_PROJECT_ID env variable is required"
}
```

---

## Testing Tips

1. **Check Console Logs:** सभी requests console में log होते हैं
2. **Use `-v` flag:** Verbose output के लिए `curl -v` use करें
3. **Pretty Print:** JSON को readable format में देखने के लिए `jq` use करें
4. **Environment Variables:** Project ID को `.env` file में set करें

---

## Quick Test Commands

```bash
# Test 1: List all sessions
curl "http://localhost:3000/api/v1/live-kit?list_sessions=true&project_id=p_test"

# Test 2: Get specific session
curl "http://localhost:3000/api/v1/live-kit?livekit_session_id=SE_test123&project_id=p_test"

# Test 3: Get transcript
curl "http://localhost:3000/api/v1/live-kit?session_id=test-session-id"
```

