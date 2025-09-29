# Email Setup Guide for Team Invitations

## Overview
The team invitation system can send real emails using different email services. Here's how to set it up:

## Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Generate password for "Mail"
3. **Add to .env.local:**
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_PASS=your-16-character-app-password
   ```

## Option 2: Custom SMTP Provider

Add to your .env.local:
```
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=noreply@yourcompany.com
```

## Option 3: Development Mode (No Setup Required)

If no email configuration is provided, the system automatically uses **Ethereal Email** (test service):
- Creates test email accounts automatically
- Shows preview URLs in console
- Perfect for development and testing

## How It Works

1. **Invite Member:** Click "Invite Member" in Company Profile
2. **Email Sent:** System sends HTML email with invitation link
3. **Console Output:** Shows invitation link and preview URL (if available)
4. **Database:** Invitation is stored in `team_invitations` table

## Testing Without Email Setup

Even without email configuration:
1. Invitation is created in database
2. Console shows the invitation link
3. Copy the link from console to test invitation flow
4. Preview URL is provided for Ethereal emails

## Email Template Features

- Professional HTML design
- Company branding
- Role information
- Secure invitation token
- 7-day expiration
- Mobile-friendly layout

## Troubleshooting

- **Gmail:** Use App Password, not regular password
- **SMTP:** Check port and security settings
- **Development:** Check console for preview URLs
- **Database:** Verify invitation is created in `team_invitations` table
