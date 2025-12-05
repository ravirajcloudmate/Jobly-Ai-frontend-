# Email Setup Guide - Supabase Email Verification

## Problem: Email नहीं जा रहा है

अगर signup के बाद verification email नहीं मिल रहा है, तो नीचे दिए गए steps follow करें:

## Quick Fix Steps

### 1. Supabase Dashboard में Settings Check करें

1. **Supabase Dashboard** खोलें: https://app.supabase.com
2. अपना **Project** select करें
3. **Authentication** → **Settings** पर जाएं
4. **Email Auth** section में:
   - ✅ **"Enable email confirmations"** को **ON** करें
   - ✅ **"Enable signup"** को **ON** करें

### 2. SMTP Configuration (Production के लिए)

**Option A: Supabase Default Email Service (Free Tier)**
- Free tier में Supabase automatically emails भेजता है
- Rate limit: **3 emails/hour**
- Emails spam folder में जा सकते हैं

**Option B: Custom SMTP (Recommended for Production)**

1. **Project Settings** → **Auth** → **SMTP Settings** पर जाएं
2. SMTP credentials add करें:
   - **SMTP Host**: `smtp.gmail.com` (Gmail के लिए)
   - **SMTP Port**: `587` (TLS) या `465` (SSL)
   - **SMTP User**: आपका email
   - **SMTP Password**: Gmail App Password (regular password नहीं)
   - **Sender Email**: आपका email
   - **Sender Name**: आपका company name

### 3. Gmail App Password बनाना

1. Google Account → **Security** पर जाएं
2. **2-Step Verification** enable करें (अगर नहीं है)
3. **App Passwords** पर जाएं
4. **Select app**: "Mail" select करें
5. **Select device**: "Other" select करें और "Supabase" type करें
6. **Generate** button click करें
7. 16-character password copy करें
8. इस password को Supabase SMTP settings में use करें

### 4. Email Templates Check करें

1. **Authentication** → **Email Templates** पर जाएं
2. **"Confirm signup"** template check करें
3. Template properly configured है या नहीं verify करें

### 5. Local Development में Testing

अगर local development में test कर रहे हैं:

1. **supabase/config.toml** file check करें:
   ```toml
   [auth.email]
   enable_confirmations = true  # यह true होना चाहिए
   ```

2. Supabase local instance restart करें:
   ```bash
   supabase stop
   supabase start
   ```

3. Email logs check करें:
   - Supabase Dashboard → **Logs** → **Auth Logs**
   - यहाँ email sending errors दिखेंगे

## Troubleshooting

### Email Spam Folder में है?
- Gmail/Outlook के spam folder check करें
- Email provider के spam settings check करें

### Rate Limit Error?
- Free tier: **3 emails/hour** limit
- Solution: Wait करें या paid plan upgrade करें

### SMTP Authentication Failed?
- Gmail App Password use करें (regular password नहीं)
- 2-Step Verification enable होना चाहिए
- SMTP settings correctly configured हैं या नहीं check करें

### Email Template Error?
- Supabase Dashboard → Authentication → Email Templates
- "Confirm signup" template properly configured है या नहीं check करें

## Testing Email Configuration

### API Endpoint से Check करें:
```bash
# Email configuration check
curl http://localhost:3000/api/check-email-verification

# Email config check
curl http://localhost:3000/api/check-email-config
```

## Important Notes

1. **Free Tier Limitations**:
   - Max 3 emails/hour
   - Emails spam में जा सकते हैं
   - Production के लिए custom SMTP recommended है

2. **Development vs Production**:
   - Development: Supabase default email service use कर सकते हैं
   - Production: Custom SMTP configure करना better है

3. **Email Delivery**:
   - Emails deliver होने में 1-2 minutes लग सकते हैं
   - Spam folder check करना न भूलें

## Support

अगर अभी भी issue है:
1. Supabase Dashboard → Logs → Auth Logs check करें
2. Browser console में errors check करें
3. Network tab में API calls verify करें

