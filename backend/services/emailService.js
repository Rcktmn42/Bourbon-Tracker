// backend/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

/* dotenv.config(); */
// Get current directory for template paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    this.fromName = process.env.EMAIL_FROM_NAME || 'WakePour';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
    this.adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    this.siteUrl = process.env.FRONTEND_URL || 'https://wakepour.com';
  }

  /**
   * Load and process an HTML email template
   * @param {string} templateName - Name of template file (without .html)
   * @param {object} variables - Variables to replace in template
   * @returns {string} Processed HTML content
   */
  loadTemplate(templateName, variables = {}) {
    try {
      const templatePath = join(__dirname, '..', 'templates', `${templateName}.html`);
      let html = readFileSync(templatePath, 'utf8');
      
      // Replace variables in template ({{variable}} format)
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, variables[key] || '');
      });
      
      return html;
    } catch (error) {
      console.error(`Failed to load email template: ${templateName}`, error);
      // Fallback to plain text if template fails
      return `<p>Email content not available</p>`;
    }
  }

  /**
   * Send email with error handling and logging
   * @param {object} options - Email options (to, subject, html, text)
   * @returns {object} Result with success status and message
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text fallback
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to send email'
      };
    }
  }

  /**
   * Generate a 6-digit verification code
   * @returns {string} 6-digit numeric code
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send email verification code to new user
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @param {string} verificationCode - 6-digit verification code
   * @returns {object} Email send result
   */
  async sendVerificationEmail(userEmail, firstName, verificationCode) {
    const html = this.loadTemplate('email-verification', {
      firstName: firstName,
      siteName: this.fromName,
      verificationCode: verificationCode,
      supportEmail: this.adminEmail,
      email: userEmail
    });

    return await this.sendEmail({
      to: userEmail,
      subject: 'Verify Your Email - WakePour',
      html
    });
  }

  /**
   * Send welcome email to new user (called after email verification)
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @returns {object} Email send result
   */
  async sendWelcomeEmail(userEmail, firstName) {
    const html = this.loadTemplate('welcome', {
      firstName: firstName,
      siteName: this.fromName,
      supportEmail: this.adminEmail
    });

    return await this.sendEmail({
      to: userEmail,
      subject: 'Welcome to WakePour - Account Pending Approval',
      html
    });
  }

  /**
   * Send notification to admin about new user registration (called after email verification)
   * @param {object} user - User object with registration details
   * @returns {object} Email send result
   */
  async sendAdminNotification(user) {
    const html = this.loadTemplate('admin-notification', {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number || 'Not provided',
      registrationDate: new Date(user.created_at).toLocaleDateString(),
      userId: user.user_id
    });

    return await this.sendEmail({
      to: this.adminEmail,
      subject: `New User Registration: ${user.first_name} ${user.last_name}`,
      html
    });
  }

  /**
   * Send account approval notification to user
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @returns {object} Email send result
   */
  async sendApprovalEmail(userEmail, firstName) {
    const html = this.loadTemplate('approval', {
      firstName: firstName,
      siteName: this.fromName,
      loginUrl: this.siteUrl,
      supportEmail: this.adminEmail
    });

    return await this.sendEmail({
      to: userEmail,
      subject: 'Your WakePour Account Has Been Approved!',
      html
    });
  }

  /**
   * Send password reset email
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @param {string} resetToken - Password reset token
   * @returns {object} Email send result
   */
  async sendPasswordResetEmail(userEmail, firstName, resetToken) {
    const resetUrl = `${this.siteUrl}/reset-password?token=${resetToken}`;
    
    const html = this.loadTemplate('password-reset', {
      firstName: firstName,
      resetUrl: resetUrl,
      siteName: this.fromName,
      supportEmail: this.adminEmail
    });

    return await this.sendEmail({
      to: userEmail,
      subject: 'Password Reset Request - WakePour',
      html
    });
  }

  /**
   * Test the email service connection
   * @returns {object} Connection test result
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      return {
        success: true,
        message: 'Email service connection successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Email service connection failed'
      };
    }
  }
}

// Export singleton instance
export default new EmailService();