import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json()
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Supabase configuration missing',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Test 1: Check user exists
    let userCheck = null
    if (userId) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (!userError && userData?.user) {
          userCheck = {
            exists: true,
            email: userData.user.email,
            email_confirmed_at: userData.user.email_confirmed_at,
            confirmation_sent_at: userData.user.confirmation_sent_at
          }
        } else {
          userCheck = {
            exists: false,
            error: userError?.message
          }
        }
      } catch (e: any) {
        userCheck = {
          exists: false,
          error: e.message
        }
      }
    }

    // Test 2: Try to generate verification link
    let linkGeneration = null
    try {
      console.log('🔑 Attempting to generate verification link for:', email)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
        }
      } as any)

      if (linkError) {
        linkGeneration = {
          success: false,
          error: linkError.message,
          code: linkError.status,
          name: linkError.name,
          fullError: linkError
        }
        console.error('❌ Link generation error:', linkError)
      } else if (linkData?.properties?.action_link) {
        linkGeneration = {
          success: true,
          hasLink: true,
          linkPreview: linkData.properties.action_link.substring(0, 100) + '...',
          linkLength: linkData.properties.action_link.length
        }
        console.log('✅ Link generated successfully')
      } else {
        linkGeneration = {
          success: false,
          error: 'No action_link in response',
          receivedData: linkData,
          dataKeys: linkData ? Object.keys(linkData) : null
        }
        console.warn('⚠️ No action_link in response:', linkData)
      }
    } catch (e: any) {
      linkGeneration = {
        success: false,
        error: e.message,
        errorName: e.name,
        stack: e.stack,
        fullError: e.toString()
      }
      console.error('❌ Exception during link generation:', e)
    }

    // Test 3: Check Supabase project settings (via API if possible)
    const diagnostics = {
      supabaseUrl: supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      userCheck,
      linkGeneration,
      recommendations: [
        '1. Check Supabase Dashboard > Authentication > Settings > Enable email confirmations',
        '2. Check Supabase Dashboard > Project Settings > Auth > SMTP Settings',
        '3. Verify email is not in spam folder',
        '4. Check Supabase Dashboard > Logs > Auth Logs for email sending errors',
        '5. Free tier has 3 emails/hour limit - check if limit reached'
      ]
    }

    // Determine the issue and provide specific solution
    let issue = 'Unknown issue'
    let solution = 'Check Supabase Dashboard settings'
    
    if (linkGeneration?.error) {
      const errorMsg = linkGeneration.error.toLowerCase()
      if (errorMsg.includes('user already registered') || errorMsg.includes('already exists')) {
        issue = 'User already exists'
        solution = 'User is already registered. Try resending verification email or use sign in instead.'
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('too many')) {
        issue = 'Rate limit exceeded'
        solution = 'Free tier limit: max 3 emails/hour. Wait 1 hour and try again.'
      } else if (errorMsg.includes('smtp') || errorMsg.includes('email')) {
        issue = 'SMTP configuration issue'
        solution = 'Configure SMTP in Supabase Dashboard > Project Settings > Auth > SMTP Settings'
      } else if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
        issue = 'Permission error'
        solution = 'Check SUPABASE_SERVICE_ROLE_KEY is correct in .env.local'
      } else {
        issue = linkGeneration.error
        solution = 'Check Supabase Dashboard > Authentication > Settings and verify email confirmations are enabled'
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email sending diagnostic completed',
      diagnostics,
      issue: linkGeneration?.success ? null : issue,
      solution: linkGeneration?.success ? null : solution,
      nextSteps: linkGeneration?.success 
        ? 'Link generation successful. Check Supabase SMTP settings if email not received.'
        : `Link generation failed: ${issue}. ${solution}`,
      detailedError: linkGeneration?.success ? null : {
        error: linkGeneration.error,
        code: linkGeneration.code,
        name: linkGeneration.name,
        fullError: linkGeneration.fullError
      }
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

