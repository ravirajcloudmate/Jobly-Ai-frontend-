import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email, candidateName, interviewLink, jobTitle, companyName } = await request.json()
    
    if (!email || !interviewLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Sending interview reminder email to:', email)

    // Create email transporter (same logic as invitation)
    let transporter;
    
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
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
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS,
        },
      });
    } else {
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

    // Send email
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@interview-ai.com',
      to: email,
      subject: subject,
      html: htmlContent,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Interview reminder email sent successfully:', info.messageId)

    // Log preview URL for development
    if (process.env.NODE_ENV === 'development') {
      try {
        const previewURL = nodemailer.getTestMessageUrl(info)
        if (previewURL) {
          console.log('Reminder Preview URL:', previewURL)
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
    console.error('Error sending interview reminder email:', error)
    return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 500 })
  }
}
