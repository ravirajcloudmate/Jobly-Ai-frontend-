import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, fullName, companyName, userId } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log('📧 Sending verification email to:', email)

    // Generate email verification link
    let verificationLink = ''
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Try to use Supabase admin API if service key is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey && userId) {
      try {
        console.log('🔑 Attempting to generate Supabase verification link...')
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
        
        // Generate a verification token using Supabase admin API
        // Note: For email verification, we use 'email' type instead of 'signup'
        const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'email',
          email: email,
          options: {
            redirectTo: `${baseUrl}/auth/callback`
          }
        } as any)

        if (tokenError) {
          console.warn('⚠️ Supabase token generation error:', tokenError.message)
        } else if (tokenData?.properties?.action_link) {
          verificationLink = tokenData.properties.action_link
          console.log('✅ Generated Supabase verification link')
        }
      } catch (supabaseError: any) {
        console.warn('⚠️ Supabase admin API error:', supabaseError.message)
        // Continue with fallback link
      }
    }

    // Fallback: Create a custom verification link if Supabase link generation failed
    if (!verificationLink) {
      if (userId) {
        // Create verification link with user ID and email
        verificationLink = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`
      } else {
        // Simple verification link with just email
        verificationLink = `${baseUrl}/auth/verify-email?email=${encodeURIComponent(email)}`
      }
      console.log('📧 Using fallback verification link')
    }

    // Create email transporter
    let transporter;
    
    // Try to use environment variables for email configuration
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Production SMTP configuration
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('✅ Using SMTP configuration');
    } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      // Gmail configuration
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS, // Use App Password for Gmail
        },
      });
      console.log('✅ Using Gmail configuration');
    } else {
      // Development mode - use Ethereal (test email service)
      console.log('⚠️ Using Ethereal test email service (development mode)');
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const displayName = fullName || email.split('@')[0]
    const displayCompany = companyName || 'Jobly.Ai'

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
          }
          .email-wrapper {
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content { 
            background: #f9f9f9; 
            padding: 40px 30px; 
          }
          .content h2 {
            color: #1e40af;
            margin-top: 0;
            font-size: 20px;
          }
          .content p {
            margin: 15px 0;
            color: #555;
            font-size: 16px;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
            color: white; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .link-box {
            background: #e9e9e9; 
            padding: 15px; 
            border-radius: 6px; 
            word-break: break-all;
            font-size: 12px;
            color: #666;
            margin: 20px 0;
            border-left: 4px solid #6366F1;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #999; 
            font-size: 14px; 
            padding: 20px;
            background: #ffffff;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="email-wrapper">
            <div class="header">
              <h1>🎉 Welcome to Jobly.Ai!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Hi ${displayName}!</p>
              <p>Thank you for creating an account with <strong>${displayCompany}</strong> on Jobly.Ai.</p>
              <p>To complete your registration and start using our platform, please verify your email address by clicking the button below:</p>
              
              <div class="button-container">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <div class="link-box">${verificationLink}</div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong> This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
              </div>
              
              <p>Once verified, you'll be able to:</p>
              <ul style="color: #555; line-height: 2;">
                <li>Access your dashboard</li>
                <li>Create and manage job postings</li>
                <li>Conduct AI-powered interviews</li>
                <li>View candidate reports</li>
              </ul>
              
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p><strong>Best regards,</strong><br>The Jobly.Ai Team</p>
              <p style="margin-top: 15px; font-size: 12px; color: #999;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const textContent = `
Welcome to Jobly.Ai!

Hi ${displayName}!

Thank you for creating an account with ${displayCompany} on Jobly.Ai.

To complete your registration, please verify your email address by clicking the link below:

${verificationLink}

This verification link will expire in 24 hours.

If you didn't create this account, please ignore this email.

Best regards,
The Jobly.Ai Team
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@jobly.ai',
      to: email,
      subject: `Verify Your Email - Welcome to ${displayCompany} on Jobly.Ai`,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);

    // For development, show preview URL
    let previewUrl = null;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('📧 Preview URL (Ethereal):', previewUrl);
      }
    } catch (e) {
      // Preview URL not available (production mode)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Verification email sent successfully',
      messageId: info.messageId,
      previewUrl: previewUrl,
      verificationLink: verificationLink,
      email: email
    })

  } catch (err: any) {
    console.error('❌ Email sending error:', err)
    console.error('❌ Error stack:', err?.stack)
    console.error('❌ Error details:', {
      message: err?.message,
      code: err?.code,
      command: err?.command,
      response: err?.response,
      responseCode: err?.responseCode
    })
    
    // Provide more helpful error messages
    let errorMessage = err?.message || 'Failed to send verification email'
    let errorDetails = err?.stack

    // Check for common email errors
    if (err?.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please check your SMTP/Gmail credentials.'
    } else if (err?.code === 'ECONNECTION') {
      errorMessage = 'Could not connect to email server. Please check your SMTP settings.'
    } else if (err?.code === 'ETIMEDOUT') {
      errorMessage = 'Email server connection timed out. Please try again.'
    } else if (err?.responseCode === 535) {
      errorMessage = 'Email authentication failed. For Gmail, use an App Password instead of your regular password.'
    } else if (err?.responseCode === 550) {
      errorMessage = 'Email address rejected by server. Please check the recipient email address.'
    }

    return NextResponse.json({ 
      success: false,
      error: errorMessage,
      details: errorDetails,
      troubleshooting: {
        smtp: 'Check SMTP_HOST, SMTP_USER, SMTP_PASS environment variables',
        gmail: 'For Gmail, use GMAIL_USER and GMAIL_PASS (App Password)',
        development: 'In development, Ethereal email will be used automatically if no SMTP/Gmail config found'
      }
    }, { status: 500 })
  }
}

