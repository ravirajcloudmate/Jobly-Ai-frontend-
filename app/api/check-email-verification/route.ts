import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json({
        error: 'Supabase URL not configured',
        checks: {
          supabaseUrl: false,
          emailConfig: 'Cannot check without Supabase URL'
        }
      }, { status: 500 })
    }

    const checks = {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: !!supabaseServiceKey,
      emailConfig: 'Check Supabase Dashboard',
      instructions: [
        '1. Go to Supabase Dashboard > Authentication > Settings',
        '2. Check "Enable email confirmations" is enabled',
        '3. Go to Authentication > Email Templates',
        '4. Verify "Confirm signup" template exists and is configured',
        '5. Go to Project Settings > Auth > SMTP Settings',
        '6. Configure SMTP or use Supabase default email service',
        '7. For development, emails might go to spam folder',
        '8. Check Supabase logs: Dashboard > Logs > Auth Logs'
      ]
    }

    return NextResponse.json({
      success: true,
      message: 'Email verification check',
      checks,
      troubleshooting: {
        emailNotSending: [
          'Email confirmations might be disabled in Supabase',
          'SMTP not configured in Supabase dashboard',
          'Email template not configured',
          'Check spam/junk folder',
          'Rate limiting on free tier (max 3 emails/hour)'
        ],
        howToFix: [
          'Enable email confirmations: Authentication > Settings > Email Auth',
          'Configure SMTP: Project Settings > Auth > SMTP Settings',
          'Check email template: Authentication > Email Templates > Confirm signup',
          'For testing, disable email confirmation temporarily',
          'Check Supabase logs for email sending errors'
        ]
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check email verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

