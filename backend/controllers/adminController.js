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
  const { status } = req.body;
  
  if (!['pending','active','disabled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

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
      .update({ status, updated_at: new Date() });

    if (!count) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send approval email if user was activated
    if (status === 'active' && user.status === 'pending') {
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

    res.json({ message: `User ${userId} status set to ${status}` });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}