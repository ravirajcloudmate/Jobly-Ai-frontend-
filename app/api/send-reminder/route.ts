import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, candidateName, interviewLink, jobTitle, companyName, companyId } = await request.json()
    
    if (!email || !interviewLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Sending interview reminder email to:', email)

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
            console.log('✅ Using email settings from company_settings table for reminder');
            console.log('📧 Reminder email will be sent FROM:', gmailUser);
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
              console.log('✅ Using email settings from companies.settings JSONB for reminder');
              console.log('📧 Reminder email will be sent FROM:', gmailUser);
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
        console.log('✅ Using email settings from environment variables for reminder');
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
      console.log('📧 Using Gmail service for reminder with:', gmailUser);
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
      console.log('📧 Using SMTP configuration for reminder');
    } else {
      // Development mode - use Ethereal
      console.log('⚠️ Using Ethereal test email service for reminder (development mode)');
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

    // Email content for reminder
    const subject = `Reminder: Interview Invitation - ${jobTitle || 'Position'}`
    const candidateDisplayName = candidateName || email.split('@')[0]
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #ff9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ff9800; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ Interview Reminder</h1>
              <p>Don't forget about your interview opportunity</p>
            </div>
            
            <div class="content">
              <h2>Hi ${candidateDisplayName}!</h2>
              
              <p>This is a friendly reminder about your pending interview for the <strong>${jobTitle || 'position'}</strong> at <strong>${companyName || 'our company'}</strong>.</p>
              
              <div class="highlight">
                <h3>🎯 Your Interview is Waiting</h3>
                <p>We noticed you haven't started your interview yet. Don't worry - you can begin whenever you're ready!</p>
                <ul>
                  <li>⏱️ The interview takes about 20-45 minutes</li>
                  <li>💻 You can take it from any device with internet</li>
                  <li>🎤 Make sure you have a quiet environment</li>
                  <li>📝 Have your resume handy for reference</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewLink}" class="button">🚀 Start Interview Now</a>
              </div>
              
              <p><strong>Direct Link:</strong> <a href="${interviewLink}">${interviewLink}</a></p>
              
              <p>If you have any questions or technical issues, please contact our team.</p>
              
              <p>We look forward to learning more about you!</p>
              
              <p>Best regards,<br>
              The ${companyName || 'Hiring'} Team</p>
            </div>
            
            <div class="footer">
              <p>This is a reminder for your interview invitation. If you no longer wish to proceed, you can ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email - Use email from settings (gmailUser) as the FROM address
    // Priority: Use email from settings first, then fallback to env vars
    const fromEmail = gmailUser || smtpUser || process.env.SMTP_FROM || 'noreply@interview-ai.com';
    
    // Log which email is being used
    if (gmailUser) {
      console.log('📧 Sending reminder email FROM (Settings):', gmailUser);
    } else if (smtpUser) {
      console.log('📧 Sending reminder email FROM (SMTP Env):', smtpUser);
    } else {
      console.log('📧 Sending reminder email FROM (Fallback):', fromEmail);
    }
    
    const mailOptions = {
      from: `"${companyName || 'AI Interview'}" <${fromEmail}>`,
      to: email,
      subject: subject,
      html: htmlContent,
    }

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Interview reminder email sent successfully:', info.messageId);
      
      // Log preview URL for development
      if (process.env.NODE_ENV === 'development') {
        try {
          const previewURL = nodemailer.getTestMessageUrl(info);
          if (previewURL) {
            console.log('Reminder Preview URL:', previewURL);
          }
        } catch (previewError) {
          console.log('Could not generate preview URL:', previewError);
        }
      }

      return NextResponse.json({ 
        success: true, 
        messageId: info.messageId,
        previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
      });
    } catch (sendError: any) {
      console.error('❌ Reminder email sending error:', sendError);
      const errorMessage = sendError?.message || 'Failed to send reminder email';
      let userFriendlyError = errorMessage;
      let hint = '';
      
      // Provide user-friendly error messages for common issues
      if (errorMessage.includes('Invalid login') || errorMessage.includes('authentication failed')) {
        userFriendlyError = 'Email authentication failed. Please check your Gmail App Password.';
        hint = 'Make sure you are using a 16-character App Password (not your regular Gmail password).';
      } else if (errorMessage.includes('EAUTH') || errorMessage.includes('authentication')) {
        userFriendlyError = 'Email authentication error. Invalid credentials.';
        hint = 'Please verify your email and App Password in Settings → Email Settings.';
      }
      
      return NextResponse.json(
        {
          error: userFriendlyError,
          hint: hint || 'Please check your email settings in Settings → Email Settings tab.',
          details: sendError?.message,
          code: sendError?.code
        },
        { status: 500 }
      );
    }


  } catch (error) {
    console.error('Error sending interview reminder email:', error)
    return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 500 })
  }
}
