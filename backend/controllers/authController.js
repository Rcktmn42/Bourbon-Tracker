// backend/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';
import userDb from '../config/db.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

/* dotenv.config(); */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Enhanced password validation
function validatePassword(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 128) {
    return 'Password must be less than 128 characters';
  }
  // Optional: Add complexity requirements
  // if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
  //   return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  // }
  return null;
}

// Enhanced email validation
function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  if (email.length > 255) {
    return 'Email address is too long';
  }
  return null;
}

// Enhanced name validation
function validateName(name, fieldName) {
  if (!name || !name.trim()) {
    return `${fieldName} is required`;
  }
  if (name.trim().length > 50) {
    return `${fieldName} must be less than 50 characters`;
  }
  // Prevent potential XSS in names
  if (/<[^>]*>/g.test(name)) {
    return `${fieldName} contains invalid characters`;
  }
  return null;
}

/**
 * Register a new user with email verification
 */
export async function register(req, res) {
  const { first_name, last_name, email, phone_number, password } = req.body;

  // Enhanced validation
  const firstNameError = validateName(first_name, 'First name');
  if (firstNameError) return res.status(400).json({ error: firstNameError });

  const lastNameError = validateName(last_name, 'Last name');
  if (lastNameError) return res.status(400).json({ error: lastNameError });

  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ error: passwordError });

  // Phone number validation (optional field)
  if (phone_number && phone_number.trim()) {
    const cleanPhone = phone_number.replace(/\D/g, ''); // Remove non-digits
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }
  }

  try {
    // Check if user already exists
    const existingUser = await userDb('users')
      .select('email', 'status', 'email_verified')
      .where('email', email.toLowerCase().trim())
      .first();

    if (existingUser) {
      if (existingUser.email_verified) {
        return res.status(400).json({ error: 'An account with this email already exists' });
      } else {
        // User exists but hasn't verified email - we can resend verification
        return res.status(400).json({ 
          error: 'An account with this email exists but is not verified. Please check your email for the verification code.',
          code: 'UNVERIFIED_EXISTS'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification code and expiration
    const verificationCode = emailService.generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Create user account (unverified)
    const [userId] = await userDb('users').insert({
      first_name: first_name.trim(),
      last_name: last_name.trim(), 
      email: email.toLowerCase().trim(),
      phone_number: phone_number?.replace(/\D/g, '') || null, // Store only digits
      password_hash: hashedPassword,
      status: 'pending',
      email_verified: 0,
      verification_token: verificationCode,
      verification_token_expires: verificationExpires.toISOString(),
      verification_attempts: 0,
      created_at: new Date().toISOString()
    });

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(
      email.toLowerCase().trim(),
      first_name.trim(),
      verificationCode
    );

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Still return success since user was created, but log the email failure
    }

    console.log(`✅ User registered: ${email} (ID: ${userId})`);

    res.status(201).json({
      message: 'Registration successful! Please check your email for a verification code.',
      userId: userId,
      email: email.toLowerCase().trim()
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}

/**
 * Verify email address with 6-digit code
 */
export async function verifyEmail(req, res) {
  const { email, code } = req.body;

  // Enhanced validation
  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  if (!code || !code.trim() || code.trim().length !== 6 || !/^\d{6}$/.test(code.trim())) {
    return res.status(400).json({ error: 'Verification code must be exactly 6 digits' });
  }

  try {
    // Get user with verification details
    const user = await userDb('users')
      .select('user_id', 'first_name', 'last_name', 'email', 'status', 'verification_token', 
              'verification_token_expires', 'verification_attempts', 'email_verified')
      .where('email', email.toLowerCase().trim())
      .where('email_verified', 0)
      .first();

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or verification already completed' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Check if verification code has expired
    const now = new Date();
    const expires = new Date(user.verification_token_expires);
    if (now > expires) {
      return res.status(400).json({ 
        error: 'Verification code has expired. Please request a new one.',
        code: 'EXPIRED'
      });
    }

    // Check verification attempts
    if (user.verification_attempts >= 3) {
      return res.status(400).json({ 
        error: 'Too many verification attempts. Please request a new code.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Verify the code
    if (code.trim() !== user.verification_token) {
      // Increment attempts
      await userDb('users')
        .where('user_id', user.user_id)
        .update({
          verification_attempts: userDb.raw('verification_attempts + 1'),
          verification_last_attempt: new Date().toISOString()
        });

      const remainingAttempts = 3 - (user.verification_attempts + 1);
      return res.status(400).json({ 
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }

    // Code is correct - verify the user
    await userDb('users')
      .where('user_id', user.user_id)
      .update({
        email_verified: 1,
        status: 'pending',
        verification_token: null,
        verification_token_expires: null,
        verification_attempts: 0
      });

    // Now send welcome email and admin notification
    const emailResults = await Promise.allSettled([
      emailService.sendWelcomeEmail(user.email, user.first_name),
      emailService.sendAdminNotification({
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        created_at: new Date().toISOString()
      })
    ]);

    // Log any email failures but don't fail the verification
    emailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const emailType = index === 0 ? 'welcome' : 'admin notification';
        console.error(`Failed to send ${emailType} email:`, result.reason);
      }
    });

    console.log(`✅ Email verified for user: ${user.email} (ID: ${user.user_id})`);

    res.json({
      message: 'Email verified successfully! Your account is now pending admin approval.',
      verified: true
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

/**
 * Resend verification code
 */
export async function resendVerification(req, res) {
  const { email } = req.body;

  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  try {
    const user = await userDb('users')
      .select('user_id', 'first_name', 'email', 'status', 'email_verified', 'verification_last_attempt')
      .where('email', email.toLowerCase().trim())
      .where('email_verified', 0)
      .first();

    if (!user) {
      return res.status(400).json({ error: 'User not found or verification already completed' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Check cooldown (60 seconds between resend requests)
    if (user.verification_last_attempt) {
      const lastAttempt = new Date(user.verification_last_attempt);
      const now = new Date();
      const timeSinceLastAttempt = (now - lastAttempt) / 1000; // seconds
      
      if (timeSinceLastAttempt < 60) {
        const waitTime = Math.ceil(60 - timeSinceLastAttempt);
        return res.status(429).json({ 
          error: `Please wait ${waitTime} seconds before requesting a new code`,
          waitTime
        });
      }
    }

    // Generate new verification code
    const verificationCode = emailService.generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Update user with new code and reset attempts
    await userDb('users')
      .where('user_id', user.user_id)
      .update({
        verification_token: verificationCode,
        verification_token_expires: verificationExpires.toISOString(),
        verification_attempts: 0,
        verification_last_attempt: new Date().toISOString()
      });

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(
      user.email,
      user.first_name,
      verificationCode
    );

    if (!emailResult.success) {
      console.error('Failed to resend verification email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }

    console.log(`✅ Verification code resent to: ${user.email}`);

    res.json({
      message: 'New verification code sent! Please check your email.',
      sent: true
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
  }
}

/**
 * Login user
 */
export async function login(req, res) {
  const { email, password } = req.body;
  
  const emailError = validateEmail(email);
  if (emailError) return res.status(400).json({ error: emailError });

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const user = await userDb('users')
      .select('user_id', 'first_name', 'last_name', 'email', 'password_hash', 'status', 'role', 'email_verified')
      .where('email', email.toLowerCase().trim())
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(401).json({ 
        error: 'Please verify your email address before logging in',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check account status
    if (user.status === 'disabled') {
      return res.status(401).json({ 
        error: 'Your account has been disabled. Please contact support.',
        code: 'ACCOUNT_DISABLED'
      });
    }

    if (user.status === 'pending') {
      return res.status(401).json({ 
        error: 'Your account is pending approval. You will receive an email once approved.',
        code: 'ACCOUNT_PENDING'
      });
    }

    if (user.status !== 'approved' && user.status !== 'active') {
      return res.status(401).json({ 
        error: 'Your account status does not allow login. Please contact support.',
        code: 'ACCOUNT_STATUS_INVALID'
      });
    }

    // Generate JWT with shorter expiration for security
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        email: user.email, 
        role: user.role || 'user',
        firstName: user.first_name,
        lastName: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Reduced from 7d to 24h for better security
    );

    // Set HTTP-only cookie with shorter maxAge to match token expiration
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours to match JWT expiration
    });

    console.log(`✅ User logged in: ${user.email} (Role: ${user.role})`);

    res.json({
      message: 'Login successful',
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}

/**
 * Logout user
 */
export function logout(req, res) {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
}

/**
 * Get current user info
 */
export async function whoami(req, res) {
  try {
    const user = await userDb('users')
      .select('user_id', 'first_name', 'last_name', 'email', 'role', 'status', 'phone_number', 'created_at')
      .where('user_id', req.user.userId)
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone_number: user.phone_number,
      created_at: user.created_at
    });
  } catch (error) {
    console.error('whoami error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

/**
 * Change password
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  const passwordError = validatePassword(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    // Get current user
    const user = await userDb('users')
      .select('password_hash')
      .where('user_id', req.user.userId)
      .first();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await userDb('users')
      .where('user_id', req.user.userId)
      .update({ password_hash: hashedNewPassword });

    console.log(`✅ Password changed for user ID: ${req.user.userId}`);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

/**
 * Request password reset - sends email with reset link
 */
export async function requestPasswordReset(req, res) {
  const requestId = `reset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.auth('INFO', `Password reset requested [${requestId}]`, {
    email: req.body.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const { email } = req.body;

    if (!email) {
      logger.auth('WARN', `Password reset attempt without email [${requestId}]`);
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    logger.debug('AUTH_PASSWORD_RESET', `Looking up user by email [${requestId}]`, { email });
    const user = await userDb('users').where({ email }).first();

    if (!user) {
      logger.auth('WARN', `Password reset attempted for non-existent email [${requestId}]`, { email });
      // Don't reveal that the email doesn't exist for security
      return res.json({
        message: 'If an account with that email exists, you will receive a password reset link.'
      });
    }

    // Check if user has too many recent attempts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAttempts = user.password_reset_attempts || 0;
    const lastAttempt = user.password_reset_last_attempt 
      ? new Date(user.password_reset_last_attempt) 
      : null;

    logger.debug('AUTH_PASSWORD_RESET', `Rate limiting check [${requestId}]`, {
      userId: user.user_id,
      recentAttempts,
      lastAttempt: lastAttempt?.toISOString(),
      oneHourAgo: oneHourAgo.toISOString()
    });

    if (recentAttempts >= 3 && lastAttempt && lastAttempt > oneHourAgo) {
      logger.auth('WARN', `Password reset rate limited [${requestId}]`, {
        userId: user.user_id,
        email: user.email,
        attempts: recentAttempts
      });
      return res.status(429).json({
        error: 'Too many password reset attempts. Please try again later.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    logger.debug('AUTH_PASSWORD_RESET', `Generated reset token [${requestId}]`, {
      userId: user.user_id,
      tokenLength: resetToken.length,
      expiresAt: resetExpires.toISOString()
    });

    // Update user with reset token
    const updateData = {
      password_reset_token: resetToken,
      password_reset_expires: resetExpires,
      password_reset_attempts: recentAttempts + 1,
      password_reset_last_attempt: new Date()
    };

    await userDb('users')
      .where({ user_id: user.user_id })
      .update(updateData);

    logger.auth('INFO', `Password reset token saved to database [${requestId}]`, {
      userId: user.user_id,
      attempts: updateData.password_reset_attempts
    });

    // Send password reset email
    logger.email('INFO', `Attempting to send password reset email [${requestId}]`, {
      userId: user.user_id,
      email: user.email,
      firstName: user.first_name
    });

    const emailResult = await emailService.sendPasswordResetEmail(
      user.email,
      user.first_name,
      resetToken
    );

    if (emailResult.success) {
      logger.auth('SUCCESS', `Password reset email sent successfully [${requestId}]`, {
        userId: user.user_id,
        email: user.email,
        messageId: emailResult.messageId,
        emailId: emailResult.emailId
      });

      res.json({
        message: 'If an account with that email exists, you will receive a password reset link.',
        requestId // Include for debugging purposes
      });
    } else {
      logger.error('AUTH_PASSWORD_RESET', `Failed to send password reset email [${requestId}]`, {
        userId: user.user_id,
        email: user.email,
        error: emailResult.error,
        details: emailResult.details
      });

      // Clear the reset token since email failed
      await userDb('users')
        .where({ user_id: user.user_id })
        .update({
          password_reset_token: null,
          password_reset_expires: null
        });

      res.status(500).json({
        error: 'Failed to send password reset email. Please try again.',
        requestId
      });
    }

  } catch (error) {
    logger.error('AUTH_PASSWORD_RESET', `Password reset request failed [${requestId}]`, error);
    res.status(500).json({ 
      error: 'Server error during password reset request',
      requestId 
    });
  }
}

/**
 * Reset password using token from email
 */
export async function resetPassword(req, res) {
  const resetId = `password-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { token, newPassword } = req.body;
  
  logger.auth('INFO', `Password reset attempt [${resetId}]`, {
    tokenLength: token?.length,
    passwordLength: newPassword?.length,
    ip: req.ip
  });

  try {
    if (!token || !newPassword) {
      logger.auth('WARN', `Password reset with missing data [${resetId}]`, {
        hasToken: !!token,
        hasPassword: !!newPassword
      });
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required'
      });
    }

    // Validate password
    if (newPassword.length < 8 || newPassword.length > 128) {
      logger.auth('WARN', `Password reset with invalid password length [${resetId}]`, {
        length: newPassword.length
      });
      return res.status(400).json({
        success: false,
        error: 'Password must be between 8 and 128 characters'
      });
    }

    // Find user with this reset token
    logger.debug('AUTH_PASSWORD_RESET', `Looking up user by reset token [${resetId}]`);
    const user = await userDb('users')
      .where({ password_reset_token: token })
      .first();

    if (!user) {
      logger.auth('WARN', `Password reset with invalid token [${resetId}]`);
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token'
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.password_reset_expires);

    if (now > expiresAt) {
      logger.auth('WARN', `Password reset with expired token [${resetId}]`, {
        userId: user.user_id,
        expiredBy: (now - expiresAt) / 1000 / 60
      });
      return res.status(400).json({
        success: false,
        error: 'Reset token has expired'
      });
    }

    // Hash new password
    logger.debug('AUTH_PASSWORD_RESET', `Hashing new password [${resetId}]`, { userId: user.user_id });
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await userDb('users')
      .where({ user_id: user.user_id })
      .update({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        password_reset_attempts: 0,
        password_reset_last_attempt: null,
        updated_at: now
      });

    logger.auth('SUCCESS', `Password reset completed successfully [${resetId}]`, {
      userId: user.user_id,
      email: user.email
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    logger.error('AUTH_PASSWORD_RESET', `Password reset failed [${resetId}]`, error);
    res.status(500).json({
      success: false,
      error: 'Server error during password reset'
    });
  }
}

/**
 * Verify reset token (for frontend validation)
 */
export async function verifyResetToken(req, res) {
  const verifyId = `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { token } = req.params;
  
  logger.auth('INFO', `Reset token verification requested [${verifyId}]`, {
    tokenLength: token?.length,
    ip: req.ip
  });

  try {
    if (!token) {
      logger.auth('WARN', `Token verification without token [${verifyId}]`);
      return res.status(400).json({
        valid: false,
        error: 'Reset token is required'
      });
    }

    // Find user with this reset token
    logger.debug('AUTH_TOKEN_VERIFY', `Looking up user by reset token [${verifyId}]`);
    const user = await userDb('users')
      .where({ password_reset_token: token })
      .first();

    if (!user) {
      logger.auth('WARN', `Invalid reset token used [${verifyId}]`, { tokenLength: token.length });
      return res.json({
        valid: false,
        error: 'Invalid reset token'
      });
    }

    // Check if token has expired
    const now = new Date();
    const expiresAt = new Date(user.password_reset_expires);
    
    logger.debug('AUTH_TOKEN_VERIFY', `Token expiration check [${verifyId}]`, {
      userId: user.user_id,
      now: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isExpired: now > expiresAt
    });

    if (now > expiresAt) {
      logger.auth('WARN', `Expired reset token used [${verifyId}]`, {
        userId: user.user_id,
        expiredBy: (now - expiresAt) / 1000 / 60 // minutes
      });
      return res.json({
        valid: false,
        error: 'Reset token has expired'
      });
    }

    logger.auth('SUCCESS', `Reset token verified successfully [${verifyId}]`, {
      userId: user.user_id,
      email: user.email
    });

    res.json({
      valid: true,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        email: user.email
      }
    });

  } catch (error) {
    logger.error('AUTH_TOKEN_VERIFY', `Token verification failed [${verifyId}]`, error);
    res.status(500).json({
      valid: false,
      error: 'Server error during token verification'
    });
  }
}