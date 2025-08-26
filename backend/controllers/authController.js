// backend/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import userDb from '../config/db.js';
import emailService from '../services/emailService.js';

/* dotenv.config(); */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * Register a new user with email verification
 */
export async function register(req, res) {
  const { first_name, last_name, email, phone_number, password } = req.body;

  // Validation
  if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // Password strength validation
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  try {
    // Check if user already exists
    const existingUser = await userDb('users')
      .select('email', 'status', 'email_verified')
      .where('email', email.toLowerCase())
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
      email: email.toLowerCase(),
      phone_number: phone_number?.trim() || null,
      password_hash: hashedPassword,
      status: 'pending', // Use existing status instead of 'email_verification_pending'
      email_verified: 0,
      verification_token: verificationCode,
      verification_token_expires: verificationExpires.toISOString(),
      verification_attempts: 0,
      created_at: new Date().toISOString()
    });

    // Send verification email
    const emailResult = await emailService.sendVerificationEmail(
      email.toLowerCase(),
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
      email: email.toLowerCase()
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

  if (!email?.trim() || !code?.trim()) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    // Get user with verification details
    const user = await userDb('users')
      .select('user_id', 'first_name', 'last_name', 'email', 'status', 'verification_token', 
              'verification_token_expires', 'verification_attempts', 'email_verified')
      .where('email', email.toLowerCase())
      .where('email_verified', 0) // Look for unverified users instead of specific status
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

  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await userDb('users')
      .select('user_id', 'first_name', 'email', 'status', 'email_verified', 'verification_last_attempt')
      .where('email', email.toLowerCase())
      .where('email_verified', 0) // Look for unverified users instead of specific status
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
  
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await userDb('users')
      .select('user_id', 'first_name', 'last_name', 'email', 'password_hash', 'status', 'role', 'email_verified')
      .where('email', email.toLowerCase())
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

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        email: user.email, 
        role: user.role || 'user',
        firstName: user.first_name,
        lastName: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
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

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

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