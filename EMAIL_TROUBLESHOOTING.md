# Email Troubleshooting Guide

## Diagnostic Tool Error: "Link generation failed"

अगर आपको यह error मिल रहा है, तो console में `diagnostics.linkGeneration` object expand करें और exact error देखें।

## Common Errors और Solutions

### 1. "User already registered" / "User already exists"
**Error:**
```json
{
  "error": "User already registered",
  "code": 400
}
```

**Solution:**
- यह normal है अगर user पहले से exist करता है
- "Resend Email" button use करें
- या sign in page पर जाएं

### 2. "Rate limit exceeded" / "Too many requests"
**Error:**
```json
{
  "error": "Too many requests",
  "code": 429
}
```

**Solution:**
- Free tier limit: **3 emails/hour**
- 1 hour wait करें
- या Supabase paid plan upgrade करें

### 3. "SMTP configuration error" / "Email service unavailable"
**Error:**
```json
{
  "error": "Email service unavailable",
  "code": 500
}
```

**Solution:**
1. Supabase Dashboard → Project Settings → Auth → SMTP Settings
2. Gmail SMTP configure करें:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: आपका Gmail
   - Password: Gmail App Password
   - Sender Email: आपका Gmail

### 4. "Permission denied" / "Unauthorized"
**Error:**
```json
{
  "error": "Permission denied",
  "code": 403
}
```

**Solution:**
- `.env.local` file में `SUPABASE_SERVICE_ROLE_KEY` check करें
- Supabase Dashboard → Project Settings → API → Service Role Key copy करें
- Correct key set करें

### 5. "No action_link in response"
**Error:**
```json
{
  "error": "No action_link in response"
}
```

**Solution:**
- Supabase API version issue हो सकता है
- `@supabase/supabase-js` package update करें:
  ```bash
  npm update @supabase/supabase-js
  ```

## Step-by-Step Fix

### Step 1: Console में Error देखें
Browser console में:
```javascript
// Diagnostic result expand करें
diagnostics.linkGeneration
```

### Step 2: Error Type Identify करें
- Error message note करें
- Error code note करें

### Step 3: Appropriate Solution Apply करें
ऊपर दिए गए common errors में से match करें

### Step 4: Supabase Dashboard Check करें
1. **Authentication → Settings**
   - Enable email confirmations = ON
   - Enable signup = ON

2. **Project Settings → Auth → SMTP Settings**
   - SMTP properly configured है या नहीं check करें

3. **Logs → Auth Logs**
   - Email sending errors देखें

## Quick Test

Diagnostic tool को manually test करें:
```javascript
fetch('/api/test-email-sending', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'your-email@gmail.com',
    userId: 'your-user-id'
  })
})
.then(r => r.json())
.then(result => {
  console.log('Full result:', result)
  console.log('Issue:', result.issue)
  console.log('Solution:', result.solution)
  console.log('Detailed Error:', result.detailedError)
})
```

## Still Not Working?

अगर अभी भी issue है:
1. Console में complete error message share करें
2. `diagnostics.linkGeneration` object का screenshot लें
3. Supabase Dashboard → Logs → Auth Logs check करें

