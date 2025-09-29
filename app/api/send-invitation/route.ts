import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email, role, companyName, inviterName, invitationToken } = await request.json()
    
    if (!email || !role || !companyName || !invitationToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Sending invitation email to:', email)

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
    } else if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      // Gmail configuration
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS, // Use App Password for Gmail
        },
      });
    } else {
      // Development mode - use Ethereal (test email service)
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

    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${invitationToken}`;
    const roleFormatted = role.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Email HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #030213; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>InterviewAI Team Invitation</h1>
          </div>
          <div class="content">
            <h2>You're Invited to Join ${companyName}!</h2>
            <p>Hi there!</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on the InterviewAI platform.</p>
            <p><strong>Your Role:</strong> ${roleFormatted}</p>
            <p>Click the button below to accept the invitation and create your account:</p>
            <a href="${invitationLink}" class="button">Accept Invitation</a>
            <p>Or copy and paste this link in your browser:</p>
            <p style="background: #e9e9e9; padding: 10px; border-radius: 4px; word-break: break-all;">${invitationLink}</p>
            <p><strong>Note:</strong> This invitation will expire in 7 days.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>InterviewAI Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const textContent = `
      You're Invited to Join ${companyName}!
      
      Hi there!
      
      ${inviterName} has invited you to join ${companyName} on the InterviewAI platform.
      
      Your Role: ${roleFormatted}
      
      Click the link below to accept the invitation:
      ${invitationLink}
      
      This invitation will expire in 7 days.
      
      Best regards,
      InterviewAI Team
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@interviewai.com',
      to: email,
      subject: `Invitation to join ${companyName} on InterviewAI`,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);

    // For development, show preview URL
    let previewUrl = null;
    try {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL:', previewUrl);
      }
    } catch (e) {
      // Preview URL not available
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation email sent successfully',
      messageId: info.messageId,
      previewUrl: previewUrl,
      invitationLink: invitationLink
    })

  } catch (err: any) {
    console.error('Email sending error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to send invitation' }, { status: 500 })
  }
}
