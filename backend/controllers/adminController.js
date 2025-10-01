// backend/controllers/adminController.js

import db from '../config/db.js';
import emailService from '../services/emailService.js';

// List all users
export async function listUsers(req, res) {
  const users = await db('users')
    .select(
      'user_id',
      'first_name',
      'last_name',
      'email',
      'status',
      'role',
      'created_at'
    );
  res.json(users);
}

// Update a user's role
export async function updateUserRole(req, res) {
  const { userId } = req.params;
  const { role } = req.body;
  if (!['admin','power_user','user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const updated = await db('users')
    .where({ user_id: userId })
    .update({ role, updated_at: new Date() });
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ message: `User ${userId} role set to ${role}` });
}

// Update a user's status (with email notifications)
export async function updateUserStatus(req, res) {
  const { userId } = req.params;
  const { isActive } = req.body;

  // Convert boolean to status string
  const statusValue = isActive ? 'active' : 'disabled';

  try {
    // Get user info before updating (for email)
    const user = await db('users')
      .select('user_id', 'first_name', 'last_name', 'email', 'status')
      .where({ user_id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user status
    const count = await db('users')
      .where({ user_id: userId })
      .update({ status: statusValue, updated_at: new Date() });

    if (!count) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send approval email if user was activated (from non-active to active)
    if (isActive && user.status !== 'active') {
      emailService.sendApprovalEmail(user.email, user.first_name)
        .then(result => {
          if (result.success) {
            console.log(`Approval email sent to ${user.email}`);
          } else {
            console.error(`Failed to send approval email to ${user.email}:`, result.error);
          }
        })
        .catch(err => console.error('Approval email error:', err));
    }

    res.json({
      message: `User ${userId} ${isActive ? 'activated' : 'deactivated'}`,
      success: true
    });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}

// Initiate password reset for a user (admin only)
export async function initiatePasswordReset(req, res) {
  const { userId } = req.params;
  
  try {
    // Get user information
    const user = await db('users')
      .select('user_id', 'first_name', 'email', 'status', 'email_verified')
      .where({ user_id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only allow password reset for active, verified users
    if (user.status !== 'active' || !user.email_verified) {
      return res.status(400).json({ 
        error: 'Can only reset password for active, verified users',
        code: 'USER_NOT_ELIGIBLE'
      });
    }

    // Generate secure token
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save reset token to database
    await db('users')
      .where('user_id', user.user_id)
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
        password_reset_attempts: 0, // Reset attempts when admin initiates
        password_reset_last_attempt: new Date()
      });

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email,
      user.first_name,
      resetToken
    );

    if (emailResult.success) {
      console.log(`✅ Admin-initiated password reset email sent to: ${user.email} (initiated by admin: ${req.user.email})`);
      
      res.json({ 
        message: `Password reset email sent to ${user.first_name} (${user.email})`,
        success: true
      });
    } else {
      console.error(`❌ Failed to send admin-initiated password reset email to: ${user.email}`, emailResult.error);
      res.status(500).json({ error: 'Failed to send password reset email' });
    }

  } catch (error) {
    console.error('Admin password reset error:', error);
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
}