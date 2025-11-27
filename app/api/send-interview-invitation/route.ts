import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, candidateName, interviewLink, jobTitle, companyName, companyId } = await request.json();

    // Validate required fields
    if (!email || !interviewLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let gmailUser = '';
    let gmailPass = '';
    let smtpHost = '';
    let smtpUser = '';
    let smtpPass = '';

    // Try to load email settings from database if company_id is provided
    if (companyId && supabaseUrl && supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        // Try to get from company_settings table
        const { data: settingsData } = await supabaseAdmin
          .from('company_settings')
          .select('settings')
          .eq('company_id', companyId)
          .eq('category', 'email')
          .maybeSingle();

        if (settingsData?.settings) {
          const emailSettings = settingsData.settings as any;
          if (emailSettings.email && emailSettings.password) {
            gmailUser = emailSettings.email;
            gmailPass = emailSettings.password;
            console.log('✅ Using email settings from company_settings table');
            console.log('📧 Email will be sent FROM:', gmailUser);
          }
        }

        // If not found, try companies.settings JSONB field
        if (!gmailUser || !gmailPass) {
          const { data: companyData } = await supabaseAdmin
            .from('companies')
            .select('settings')
            .eq('id', companyId)
            .maybeSingle();

          if (companyData?.settings) {
            const settings = companyData.settings as any;
            if (settings.email_settings?.email && settings.email_settings?.password) {
              gmailUser = settings.email_settings.email;
              gmailPass = settings.email_settings.password;
              console.log('✅ Using email settings from companies.settings JSONB');
              console.log('📧 Email will be sent FROM:', gmailUser);
            }
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Could not load email settings from database:', dbError);
        // Continue with environment variables as fallback
      }
    }

    // Fallback to environment variables if database settings not found
    if (!gmailUser || !gmailPass) {
      smtpHost =
        process.env.SMTP_HOST ||
        process.env.EMAIL_HOST ||
        (process.env.GMAIL_USER ? 'smtp.gmail.com' : undefined);
      smtpUser =
        process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || '';
      smtpPass =
        process.env.SMTP_PASS ||
        process.env.SMTP_PASSWORD ||
        process.env.EMAIL_PASS ||
        process.env.EMAIL_PASSWORD ||
        process.env.GMAIL_PASS || '';
      gmailUser = process.env.GMAIL_USER || process.env.EMAIL_USER || '';
      gmailPass = process.env.GMAIL_PASS || process.env.EMAIL_PASS || '';
      
      if (gmailUser && gmailPass) {
        console.log('✅ Using email settings from environment variables');
      }
    }

    const smtpPort = parseInt(
      process.env.SMTP_PORT || process.env.EMAIL_PORT || '587',
      10
    );
    const smtpSecure =
      process.env.SMTP_SECURE === 'true' ||
      process.env.EMAIL_SECURE === 'true' ||
      smtpPort === 465;

    // Validate that we have email credentials
    if ((!smtpHost || !smtpUser || !smtpPass) && (!gmailUser || !gmailPass)) {
      console.error('❌ Email configuration missing. Company ID:', companyId);
      return NextResponse.json(
        { 
          error: 'Email configuration is incomplete. Please configure email settings in Settings → Email Settings tab.',
          hint: 'Go to Settings module and add your Gmail and App Password in Email Settings tab',
          details: {
            companyId: companyId || 'not provided',
            hasCompanySettings: companyId ? 'checking...' : 'no company_id',
            hasEnvVars: !!(process.env.GMAIL_USER || process.env.SMTP_USER)
          }
        },
        { status: 500 }
      );
    }

    // Create email transporter - prioritize Gmail if we have Gmail credentials
    let transporter;
    if (gmailUser && gmailPass) {
      // Use Gmail service (from database or environment)
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });
      console.log('📧 Using Gmail service with:', gmailUser);
    } else if (smtpHost && smtpUser && smtpPass) {
      // Use SMTP configuration
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      console.log('📧 Using SMTP configuration');
    } else {
      // Development mode - use Ethereal
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

    try {
      await transporter.verify();
      console.log('✅ Email transporter verified successfully');
    } catch (verifyError: any) {
      console.error('❌ Email transporter verification failed:', verifyError);
      return NextResponse.json(
        {
          error: 'Failed to verify email configuration. Please check your email credentials.',
          details: verifyError?.message || verifyError?.toString() || 'Unknown verification error',
          hint: 'Make sure your Gmail App Password is correct (16 characters) and 2-Step Verification is enabled in your Google Account',
          config: {
            smtpHost: smtpHost ? 'provided' : 'missing',
            smtpUser: smtpUser ? 'provided' : 'missing',
            gmailConfigured: !!(gmailUser && gmailPass),
            port: smtpPort,
            secure: smtpSecure,
            errorCode: verifyError?.code,
            command: verifyError?.command
          }
        },
        { status: 500 }
      );
    }

    // Email template
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #e30d0d; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; padding: 12px 30px; background: #e30d0d; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AI Interview Invitation</h1>
    </div>
    <div class="content">
      <h2>Hello ${candidateName || 'Candidate'}!</h2>
      <p>You've been invited to participate in an AI-powered interview for the position of <strong>${jobTitle || 'Position'}</strong> at <strong>${companyName || 'our company'}</strong>.</p>
      
      <p>This is a modern, AI-assisted interview experience where you'll interact with our AI interviewer. The process is:</p>
      <ul>
        <li>Professional and conversational</li>
        <li>Flexible and candidate-friendly</li>
        <li>Designed to showcase your skills effectively</li>
      </ul>

      <p>Click the button below to start your interview:</p>
      <a href="${interviewLink}" class="button">Start Interview</a>
      
      <p>Or copy this link: <br><code>${interviewLink}</code></p>

      <p><strong>Important notes:</strong></p>
      <ul>
        <li>Ensure you have a stable internet connection</li>
        <li>Use a device with camera and microphone</li>
        <li>Find a quiet, well-lit location</li>
        <li>Allow browser permissions for camera/microphone</li>
      </ul>

      <p>We look forward to learning more about you!</p>
      
      <p>Best regards,<br>${companyName || 'The Team'}</p>
    </div>
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email - Use email from settings (gmailUser) as the FROM address
    try {
      // Priority: Use email from settings first, then fallback to env vars
      const fromEmail = gmailUser || smtpUser || process.env.SMTP_FROM || 'noreply@jobly.ai';
      
      // Log which email is being used
      if (gmailUser) {
        console.log('📧 Sending email FROM (Settings):', gmailUser);
      } else if (smtpUser) {
        console.log('📧 Sending email FROM (SMTP Env):', smtpUser);
      } else {
        console.log('📧 Sending email FROM (Fallback):', fromEmail);
      }
      
      await transporter.sendMail({
        from: `"${companyName || 'AI Interview'}" <${fromEmail}>`,
        to: email,
        subject: `Interview Invitation - ${jobTitle || 'Position'}`,
        html: emailHtml
      });
      
      console.log('✅ Interview invitation email sent successfully FROM:', fromEmail, 'TO:', email);
    } catch (sendError: any) {
      console.error('❌ Email sending error:', sendError);
      const errorMessage = sendError?.message || 'Failed to send invitation email';
      let userFriendlyError = errorMessage;
      let hint = '';
      
      // Provide user-friendly error messages for common issues
      if (errorMessage.includes('Invalid login') || errorMessage.includes('authentication failed')) {
        userFriendlyError = 'Email authentication failed. Please check your Gmail App Password.';
        hint = 'Make sure you are using a 16-character App Password (not your regular Gmail password). Enable 2-Step Verification in Google Account → Security → App passwords.';
      } else if (errorMessage.includes('EAUTH') || errorMessage.includes('authentication')) {
        userFriendlyError = 'Email authentication error. Invalid credentials.';
        hint = 'Please verify your email and App Password in Settings → Email Settings.';
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        userFriendlyError = 'Email sending timed out. Please check your internet connection.';
        hint = 'Network issue detected. Please try again.';
      } else if (errorMessage.includes('ECONNECTION') || errorMessage.includes('connection')) {
        userFriendlyError = 'Could not connect to email server.';
        hint = 'Please check your internet connection and try again.';
      }
      
      return NextResponse.json(
        {
          error: userFriendlyError,
          hint: hint || 'Please check your email settings in Settings → Email Settings tab.',
          details: sendError?.message,
          code: sendError?.code,
          response: sendError?.response
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interview invitation sent successfully'
    });

  } catch (error: any) {
    console.error('❌ Email route unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invitation' },
      { status: 500 }
    );
  }
}
