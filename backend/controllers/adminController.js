// backend/controllers/adminController.js

import db from '../config/db.js';

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

// Update a user’s role
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
// Activate a pending user
export async function updateUserStatus(req, res) {
  const { userId } = req.params;
  const { status } = req.body;
  if (!['pending','active','disabled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const count = await db('users')
    .where({ user_id: userId })
    .update({ status, updated_at: new Date() });
  if (!count) return res.status(404).json({ error: 'User not found' });
  res.json({ message: `User ${userId} status set to ${status}` });
}
// Delete a user