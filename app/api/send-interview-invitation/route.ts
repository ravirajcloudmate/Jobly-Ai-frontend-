import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email, candidateName, interviewLink, jobTitle, companyName } = await request.json()
    
    if (!email || !interviewLink || !jobTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Sending interview invitation email to:', email)

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
          pass: process.env.GMAIL_PASS,
        },
      });
    } else {
      // Development: Use Ethereal Email (fake SMTP service)
      console.log('Using Ethereal Email for development');
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

    // Email content
    const subject = `Interview Invitation - ${jobTitle} at ${companyName || 'Our Company'}`
    const candidateDisplayName = candidateName || email.split('@')[0]
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .highlight { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Interview Invitation</h1>
              <p>You're invited for an AI-powered interview</p>
            </div>
            
            <div class="content">
              <h2>Hello ${candidateDisplayName}!</h2>
              
              <p>We're excited to invite you for an interview for the <strong>${jobTitle}</strong> position at <strong>${companyName || 'our company'}</strong>.</p>
              
              <div class="highlight">
                <h3>🤖 About This Interview</h3>
                <p>This is an AI-powered interview designed to assess your skills and experience. The interview is:</p>
                <ul>
                  <li>✅ Convenient - Take it at your own time</li>
                  <li>✅ Fair - Standardized questions for all candidates</li>
                  <li>✅ Efficient - Typically takes 20-45 minutes</li>
                  <li>✅ Modern - Uses advanced AI for evaluation</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${interviewLink}" class="button">🚀 Start Your Interview</a>
              </div>
              
              <div class="highlight">
                <h3>📋 What to Expect</h3>
                <ul>
                  <li>The interview will ask questions about your experience and skills</li>
                  <li>You can take your time to think and respond thoughtfully</li>
                  <li>Make sure you have a stable internet connection</li>
                  <li>Use a quiet environment for the best experience</li>
                </ul>
              </div>
              
              <p><strong>Interview Link:</strong> <a href="${interviewLink}">${interviewLink}</a></p>
              
              <p>If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
              
              <p>Best regards,<br>
              The ${companyName || 'Hiring'} Team</p>
            </div>
            
            <div class="footer">
              <p>This interview invitation was sent by ${companyName || 'our company'}. If you did not expect this email, please ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@interview-ai.com',
      to: email,
      subject: subject,
      html: htmlContent,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Interview invitation email sent successfully:', info.messageId)

    // Log preview URL for development
    if (process.env.NODE_ENV === 'development') {
      try {
        const previewURL = nodemailer.getTestMessageUrl(info)
        if (previewURL) {
          console.log('Preview URL:', previewURL)
        }
      } catch (previewError) {
        console.log('Could not generate preview URL:', previewError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
    })

  } catch (error) {
    console.error('Error sending interview invitation email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
