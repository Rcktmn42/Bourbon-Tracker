// backend/routes/authRoutes.js
import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/authMiddleware.js';
import { 
  register, 
  login, 
  logout, 
  whoami, 
  changePassword,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  verifyResetToken
} from '../controllers/authController.js';
import userDb from '../config/db.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Email verification routes (public)
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Password reset routes (public)
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/verify-reset-token/:token', verifyResetToken);

// Protected routes
router.get('/whoami', authenticate, whoami);
router.post('/change-password', authenticate, changePassword);

// DEBUG: Add a test route to see user token contents
router.get('/debug-token', authenticate, (req, res) => {
  console.log('🔍 Token Debug:', {
    hasUser: !!req.user,
    userKeys: req.user ? Object.keys(req.user) : [],
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    roleType: typeof req.user?.role,
    fullUser: req.user
  });
  
  res.json({
    message: 'Token debug info',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// TEMPORARY TEST ENDPOINTS - Remove after debugging
router.get('/test-email-system', async (req, res) => {
  const testId = `test-${Date.now()}`;
  logger.info('EMAIL_TEST', `Starting email system test [${testId}]`);
  
  try {
    const results = {
      testId,
      timestamp: new Date().toISOString(),
      environment: {
        EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
        EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing',
        FRONTEND_URL: process.env.FRONTEND_URL || 'Using default',
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'Using EMAIL_USER'
      },
      tests: {}
    };

    // Test 1: Email service initialization
    logger.info('EMAIL_TEST', `Test 1: Service initialization [${testId}]`);
    try {
      // EmailService should already be initialized
      results.tests.initialization = {
        status: '✅ PASS',
        message: 'EmailService initialized successfully'
      };
    } catch (error) {
      logger.error('EMAIL_TEST', `Service initialization failed [${testId}]`, error);
      results.tests.initialization = {
        status: '❌ FAIL',
        error: error.message
      };
    }

    // Test 2: SMTP Connection
    logger.info('EMAIL_TEST', `Test 2: SMTP connection [${testId}]`);
    try {
      const connectionResult = await emailService.testConnection();
      results.tests.smtp_connection = {
        status: connectionResult.success ? '✅ PASS' : '❌ FAIL',
        ...connectionResult
      };
    } catch (error) {
      logger.error('EMAIL_TEST', `SMTP connection test failed [${testId}]`, error);
      results.tests.smtp_connection = {
        status: '❌ FAIL',
        error: error.message
      };
    }

    // Test 3: Template loading
    logger.info('EMAIL_TEST', `Test 3: Template loading [${testId}]`);
    try {
      const testTemplate = emailService.loadTemplate('password-reset', {
        firstName: 'Test User',
        resetUrl: 'https://example.com/reset?token=test123',
        siteName: 'WakePour',
        supportEmail: 'support@wakepour.com'
      });
      
      results.tests.template_loading = {
        status: testTemplate.includes('Test User') ? '✅ PASS' : '❌ FAIL',
        templateLength: testTemplate.length,
        containsPlaceholders: testTemplate.includes('{{') ? '❌ Unreplaced placeholders found' : '✅ All placeholders replaced'
      };
    } catch (error) {
      logger.error('EMAIL_TEST', `Template loading test failed [${testId}]`, error);
      results.tests.template_loading = {
        status: '❌ FAIL',
        error: error.message
      };
    }

    // Test 4: Send test email (optional - only if query param present)
    if (req.query.send === 'true') {
      logger.info('EMAIL_TEST', `Test 4: Sending test email [${testId}]`);
      const testEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
      
      try {
        const emailResult = await emailService.sendEmail({
          to: testEmail,
          subject: `Email System Test [${testId}]`,
          html: `
            <h2>Email System Test</h2>
            <p>This is a test email to verify your email system is working.</p>
            <p><strong>Test ID:</strong> ${testId}</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p>If you received this email, your email system is functioning correctly!</p>
          `
        });

        results.tests.send_email = {
          status: emailResult.success ? '✅ PASS' : '❌ FAIL',
          ...emailResult
        };
      } catch (error) {
        logger.error('EMAIL_TEST', `Send test email failed [${testId}]`, error);
        results.tests.send_email = {
          status: '❌ FAIL',
          error: error.message
        };
      }
    } else {
      results.tests.send_email = {
        status: '⏭️ SKIPPED',
        message: 'Add ?send=true to URL to test actual email sending'
      };
    }

    // Overall result
    const failedTests = Object.values(results.tests).filter(test => test.status === '❌ FAIL').length;
    results.overall = {
      status: failedTests === 0 ? '✅ PASS' : `❌ ${failedTests} tests failed`,
      totalTests: Object.keys(results.tests).length,
      failedTests
    };

    logger.info('EMAIL_TEST', `Email system test completed [${testId}]`, {
      overall: results.overall.status,
      failedTests
    });

    res.json(results);

  } catch (error) {
    logger.error('EMAIL_TEST', `Email system test failed [${testId}]`, error);
    res.status(500).json({
      testId,
      error: 'Email system test failed',
      message: error.message,
      stack: error.stack
    });
  }
});

// Test endpoint for password reset flow specifically
router.post('/test-password-reset-flow', async (req, res) => {
  const testId = `reset-flow-${Date.now()}`;
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required for test' });
  }
  
  logger.info('EMAIL_TEST', `Testing password reset flow [${testId}]`, { email });
  
  try {
    // Check if user exists
    const user = await userDb('users').where({ email }).first();
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        testId,
        message: 'Cannot test password reset for non-existent user'
      });
    }

    // Generate test reset token (don't save to DB for test)
    const testToken = crypto.randomBytes(32).toString('hex');
    
    logger.info('EMAIL_TEST', `Attempting password reset email [${testId}]`, {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name
    });

    // Try to send the email
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email,
      user.first_name,
      testToken
    );

    res.json({
      testId,
      user: {
        user_id: user.user_id,
        email: user.email,
        first_name: user.first_name
      },
      emailResult,
      testToken: testToken.substring(0, 8) + '...', // Partial token for verification
      resetUrl: `${process.env.FRONTEND_URL || 'https://wakepour.com'}/reset-password?token=${testToken}`,
      note: 'This was a test - no actual reset token was saved to the database'
    });

  } catch (error) {
    logger.error('EMAIL_TEST', `Password reset flow test failed [${testId}]`, error);
    res.status(500).json({
      testId,
      error: 'Password reset flow test failed',
      message: error.message
    });
  }
});

export default router;