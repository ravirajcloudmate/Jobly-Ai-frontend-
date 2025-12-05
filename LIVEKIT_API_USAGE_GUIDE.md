# LiveKit API Usage Guide

## Endpoint Overview

The `/api/v1/live-kit` endpoint supports multiple operations to retrieve session information from both LiveKit Cloud API and your database.

---

## 1. List All LiveKit Sessions

**Purpose:** Get a list of all sessions from LiveKit Cloud API

**URL:** `GET /api/v1/live-kit`

**Required Parameters:**
- `list_sessions` - Set to `true` or `1` to enable listing
- `project_id` - Your LiveKit project ID (e.g., `p_proj_123`) OR set `LIVEKIT_PROJECT_ID` environment variable

**Example Request:**
```
GET http://localhost:3000/api/v1/live-kit?list_sessions=true&project_id=p_your_project_id
```

**Response:**
```json
{
  "success": true,
  "source": "livekit_cloud_api",
  "sessions": [
    {
      "id": "SE_abc123",
      "room_name": "room_123",
      "started_at": "2024-01-01T10:00:00Z",
      "ended_at": "2024-01-01T10:30:00Z",
      ...
    }
  ],
  "count": 10
}
```

**What You Need:**
- LiveKit Project ID (found in your LiveKit Cloud dashboard URL)
- Or set `LIVEKIT_PROJECT_ID` in your `.env` file

---

## 2. Get Specific LiveKit Session Details

**Purpose:** Get detailed information about a specific LiveKit session

**URL:** `GET /api/v1/live-kit`

**Required Parameters:**
- `livekit_session_id` - The LiveKit session ID (e.g., `SE_abc123xyz`)
- `project_id` - Your LiveKit project ID OR set `LIVEKIT_PROJECT_ID` environment variable

**Example Request:**
```
GET http://localhost:3000/api/v1/live-kit?livekit_session_id=SE_abc123xyz&project_id=p_your_project_id
```

**Response:**
```json
{
  "success": true,
  "source": "livekit_cloud_api",
  "session": {
    "id": "SE_abc123xyz",
    "room_name": "room_123",
    "started_at": "2024-01-01T10:00:00Z",
    "ended_at": "2024-01-01T10:30:00Z",
    "participants": [...],
    "tracks": [...],
    ...
  }
}
```

**What You Need:**
- LiveKit Session ID (starts with `SE_`)
- LiveKit Project ID

---

## 3. Get Transcript from Database

**Purpose:** Get interview transcript stored in your database (Supabase)

**URL:** `GET /api/v1/live-kit`

**Required Parameters:**
- `session_id` - Your database session ID (UUID format)

**Example Request:**
```
GET http://localhost:3000/api/v1/live-kit?session_id=550e8400-e29b-41d4-a716-446655440000
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

**What You Need:**
- Database Session ID (UUID from your `interview_sessions` table)

---

## Parameter Summary

| Parameter | Required For | Description | Example |
|-----------|--------------|-------------|---------|
| `list_sessions` | List all sessions | Set to `true` or `1` | `list_sessions=true` |
| `livekit_session_id` | Get LiveKit session | LiveKit session ID | `SE_abc123xyz` |
| `session_id` | Get transcript | Database session UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `project_id` | LiveKit operations | LiveKit project ID | `p_proj_123` |

---

## Environment Variables

You can set these in your `.env` file to avoid passing `project_id` every time:

```env
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_PROJECT_ID=p_your_project_id
```

If `LIVEKIT_PROJECT_ID` is set, you don't need to pass `project_id` in the query string.

---

## Complete Examples

### Example 1: List All Sessions (with env variable)
```bash
curl "http://localhost:3000/api/v1/live-kit?list_sessions=true"
```
*(Requires `LIVEKIT_PROJECT_ID` in `.env`)*

### Example 2: List All Sessions (with query parameter)
```bash
curl "http://localhost:3000/api/v1/live-kit?list_sessions=true&project_id=p_proj_123"
```

### Example 3: Get Specific LiveKit Session
```bash
curl "http://localhost:3000/api/v1/live-kit?livekit_session_id=SE_abc123&project_id=p_proj_123"
```

### Example 4: Get Transcript from Database
```bash
curl "http://localhost:3000/api/v1/live-kit?session_id=550e8400-e29b-41d4-a716-446655440000"
```

---

## Error Responses

### Missing Required Parameters
```json
{
  "success": false,
  "message": "session_id, livekit_session_id, or list_sessions query parameter is required"
}
```

### Missing Project ID
```json
{
  "success": false,
  "message": "project_id query parameter or LIVEKIT_PROJECT_ID env variable is required"
}
```

### Session Not Found
```json
{
  "success": false,
  "message": "Session not found"
}
```

---

## How to Find Your Project ID

1. Log in to your LiveKit Cloud dashboard
2. Look at the URL - it will be something like:
   ```
   https://cloud.livekit.io/projects/p_proj_abc123xyz
   ```
3. The part after `/projects/` is your Project ID (e.g., `p_proj_abc123xyz`)

---

## How to Find LiveKit Session ID

1. In your LiveKit Cloud dashboard, go to the Sessions page
2. Each session will have an ID that starts with `SE_`
3. You can also get it from the session details URL

---

## How to Find Database Session ID

1. Check your `interview_sessions` table in Supabase
2. The `id` column contains the UUID session ID
3. Or check your application logs when a session is created

---

## Testing in Browser

You can test directly in your browser:

```
http://localhost:3000/api/v1/live-kit?list_sessions=true&project_id=p_your_project_id
```

```
http://localhost:3000/api/v1/live-kit?livekit_session_id=SE_abc123&project_id=p_your_project_id
```

```
http://localhost:3000/api/v1/live-kit?session_id=550e8400-e29b-41d4-a716-446655440000
```

---

## Notes

- All requests are logged to the console with detailed information
- The endpoint automatically generates JWT tokens for LiveKit Cloud API access
- Transcripts are fetched from multiple sources (database tables) as fallbacks
- All responses include a `success` field to indicate operation status

