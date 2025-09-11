// backend/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import logger from '../utils/logger.js';

/* dotenv.config(); */
// Get current directory for template paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class EmailService {
  constructor() {
    logger.info('EMAIL_SERVICE', 'Initializing EmailService...');
    
    // Log environment variables (without sensitive data)
    logger.debug('EMAIL_SERVICE', 'Environment check', {
      EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
      EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing',
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Using default: WakePour',
      EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS ? '✅ Set' : 'Using EMAIL_USER',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL ? '✅ Set' : 'Using EMAIL_USER',
      FRONTEND_URL: process.env.FRONTEND_URL || 'Using default: https://wakepour.com'
    });

    try {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      logger.email('INFO', 'Nodemailer transporter created successfully');
    } catch (error) {
      logger.error('EMAIL_SERVICE', 'Failed to create nodemailer transporter', error);
      throw error;
    }

    this.fromName = process.env.EMAIL_FROM_NAME || 'WakePour';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
    this.adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    this.siteUrl = process.env.FRONTEND_URL || 'https://wakepour.com';

    logger.info('EMAIL_SERVICE', 'EmailService initialized', {
      fromName: this.fromName,
      fromAddress: this.fromAddress ? '✅ Set' : '❌ Missing',
      adminEmail: this.adminEmail ? '✅ Set' : '❌ Missing',
      siteUrl: this.siteUrl
    });
  }

  /**
   * Load and process an HTML email template
   * @param {string} templateName - Name of template file (without .html)
   * @param {object} variables - Variables to replace in template
   * @returns {string} Processed HTML content
   */
  loadTemplate(templateName, variables = {}) {
    logger.debug('EMAIL_TEMPLATE', `Loading template: ${templateName}`, { variables });
    
    try {
      const templatePath = join(__dirname, '..', 'templates', `${templateName}.html`);
      logger.debug('EMAIL_TEMPLATE', `Template path: ${templatePath}`);
      
      // Check if template file exists
      if (!existsSync(templatePath)) {
        logger.error('EMAIL_TEMPLATE', `Template file not found: ${templatePath}`);
        return `<p>Email template not found: ${templateName}</p>`;
      }

      let html = readFileSync(templatePath, 'utf8');
      logger.debug('EMAIL_TEMPLATE', `Template loaded, size: ${html.length} chars`);
      
      // Replace variables in template ({{variable}} format)
      let replacementCount = 0;
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const matches = html.match(regex);
        if (matches) {
          html = html.replace(regex, variables[key] || '');
          replacementCount += matches.length;
          logger.debug('EMAIL_TEMPLATE', `Replaced {{${key}}} ${matches.length} times with: ${variables[key]}`);
        }
      });
      
      logger.info('EMAIL_TEMPLATE', `Template processed successfully`, {
        templateName,
        replacements: replacementCount,
        finalSize: html.length
      });
      
      return html;
    } catch (error) {
      logger.error('EMAIL_TEMPLATE', `Failed to load email template: ${templateName}`, error);
      // Fallback to plain text if template fails
      return `<p>Email content not available - template error</p>`;
    }
  }

  /**
   * Send email with error handling and logging
   * @param {object} options - Email options (to, subject, html, text)
   * @returns {object} Result with success status and message
   */
  async sendEmail({ to, subject, html, text }) {
    const emailId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.email('INFO', `Starting email send [${emailId}]`, {
      to: to,
      subject: subject,
      htmlLength: html ? html.length : 0,
      textLength: text ? text.length : 0
    });

    try {
      // Validate required fields
      if (!to) {
        throw new Error('Recipient email address is required');
      }
      if (!subject) {
        throw new Error('Email subject is required');
      }
      if (!html && !text) {
        throw new Error('Email content (html or text) is required');
      }

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromAddress}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text fallback
      };

      logger.debug('EMAIL_SEND', `Mail options prepared [${emailId}]`, {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.email('SUCCESS', `Email sent successfully [${emailId}]`, {
        to: to,
        subject: subject,
        messageId: result.messageId,
        response: result.response
      });
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
        emailId: emailId
      };
    } catch (error) {
      logger.error('EMAIL_SEND', `Failed to send email [${emailId}]`, {
        to: to,
        subject: subject,
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode
      });
      
      return {
        success: false,
        error: error.message,
        message: 'Failed to send email',
        emailId: emailId,
        details: {
          code: error.code,
          command: error.command,
          responseCode: error.responseCode
        }
      };
    }
  }

  /**
   * Generate a 6-digit verification code
   * @returns {string} 6-digit numeric code
   */
  generateVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    logger.debug('EMAIL_SERVICE', `Generated verification code: ${code}`);
    return code;
  }

  /**
   * Send email verification code to new user
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @param {string} verificationCode - 6-digit verification code
   * @returns {object} Email send result
   */
  async sendVerificationEmail(userEmail, firstName, verificationCode) {
    logger.email('INFO', 'Sending verification email', {
      userEmail,
      firstName,
      codeLength: verificationCode?.length
    });

    const html = this.loadTemplate('email-verification', {
      firstName: firstName,
      siteName: this.fromName,
      verificationCode: verificationCode,
      supportEmail: this.adminEmail,
      email: userEmail
    });

    const result = await this.sendEmail({
      to: userEmail,
      subject: 'Verify Your Email - WakePour',
      html
    });

    logger.email('INFO', 'Verification email send result', {
      userEmail,
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

    return result;
  }

  /**
   * Send welcome email to new user (called after email verification)
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @returns {object} Email send result
   */
  async sendWelcomeEmail(userEmail, firstName) {
    logger.email('INFO', 'Sending welcome email', { userEmail, firstName });

    const html = this.loadTemplate('welcome', {
      firstName: firstName,
      siteName: this.fromName,
      supportEmail: this.adminEmail
    });

    const result = await this.sendEmail({
      to: userEmail,
      subject: 'Welcome to WakePour - Account Pending Approval',
      html
    });

    logger.email('INFO', 'Welcome email send result', {
      userEmail,
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

    return result;
  }

  /**
   * Send notification to admin about new user registration (called after email verification)
   * @param {object} user - User object with registration details
   * @returns {object} Email send result
   */
  async sendAdminNotification(user) {
    logger.email('INFO', 'Sending admin notification', {
      userId: user.user_id,
      userEmail: user.email,
      userName: `${user.first_name} ${user.last_name}`
    });

    const html = this.loadTemplate('admin-notification', {
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number || 'Not provided',
      registrationDate: new Date(user.created_at).toLocaleDateString(),
      userId: user.user_id
    });

    const result = await this.sendEmail({
      to: this.adminEmail,
      subject: `New User Registration: ${user.first_name} ${user.last_name}`,
      html
    });

    logger.email('INFO', 'Admin notification send result', {
      adminEmail: this.adminEmail,
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

    return result;
  }

  /**
   * Send account approval notification to user
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @returns {object} Email send result
   */
  async sendApprovalEmail(userEmail, firstName) {
    logger.email('INFO', 'Sending approval email', { userEmail, firstName });

    const html = this.loadTemplate('approval', {
      firstName: firstName,
      siteName: this.fromName,
      loginUrl: this.siteUrl,
      supportEmail: this.adminEmail
    });

    const result = await this.sendEmail({
      to: userEmail,
      subject: 'Your WakePour Account Has Been Approved!',
      html
    });

    logger.email('INFO', 'Approval email send result', {
      userEmail,
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });

    return result;
  }

  /**
   * Send password reset email
   * @param {string} userEmail - User's email address
   * @param {string} firstName - User's first name
   * @param {string} resetToken - Password reset token
   * @returns {object} Email send result
   */
  async sendPasswordResetEmail(userEmail, firstName, resetToken) {
    logger.email('INFO', 'Sending password reset email', {
      userEmail,
      firstName,
      tokenLength: resetToken?.length,
      siteUrl: this.siteUrl
    });

    const resetUrl = `${this.siteUrl}/reset-password?token=${resetToken}`;
    logger.debug('EMAIL_PASSWORD_RESET', `Reset URL: ${resetUrl}`);
    
    const html = this.loadTemplate('password-reset', {
      firstName: firstName,
      resetUrl: resetUrl,
      siteName: this.fromName,
      supportEmail: this.adminEmail
    });

    const result = await this.sendEmail({
      to: userEmail,
      subject: 'Password Reset Request - WakePour',
      html
    });

    logger.email('INFO', 'Password reset email send result', {
      userEmail,
      resetUrl,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      emailId: result.emailId
    });

    return result;
  }

  /**
   * Test the email service connection
   * @returns {object} Connection test result
   */
  async testConnection() {
    logger.email('INFO', 'Testing email service connection...');
    
    try {
      await this.transporter.verify();
      logger.email('SUCCESS', 'Email service connection test passed');
      
      return {
        success: true,
        message: 'Email service connection successful'
      };
    } catch (error) {
      logger.error('EMAIL_CONNECTION', 'Email service connection test failed', error);
      
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