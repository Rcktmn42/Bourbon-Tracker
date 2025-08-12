import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function testEmail() {
  const transporter = nodemailer.createTransport({  // Fixed: createTransport (not createTransporter)
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    // Test the connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email
    const result = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: 'jtlewis42@gmail.com', // Replace with your actual email
      subject: 'Test Email from Bourbon Tracker',
      text: 'If you receive this, email is working!',
      html: '<p>If you receive this, <strong>email is working!</strong></p>'
    });

    console.log('✅ Test email sent:', result.messageId);
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
}

testEmail();