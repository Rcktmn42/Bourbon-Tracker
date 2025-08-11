// backend/controllers/userController.js
import db from '../config/db.js';
import Joi from 'joi';

const profileSchema = Joi.object({
  first_name: Joi.string().trim().min(1).required(),
  last_name: Joi.string().trim().min(1).required(),
  phone_number: Joi.string().trim().allow(null, '').max(50), // Allow longer input for formatting
});

// Helper function to normalize phone number to digits only
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Strip everything except digits
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Must be exactly 10 or 11 digits
  if (digitsOnly.length === 10) {
    return digitsOnly; // US number without country code
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return digitsOnly.substring(1); // Remove leading 1 for US numbers
  } else if (digitsOnly.length === 0) {
    return null; // Empty phone number
  } else {
    throw new Error('Phone number must be 10 digits (US format)');
  }
}

// Helper function to format phone number for display
function formatPhoneForDisplay(phone) {
  if (!phone || phone.length !== 10) return phone;
  
  // Format as (919) 555-1234
  return `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6)}`;
}

// GET /api/user/me
export async function getProfile(req, res) {
  try {
    const user = await db('users')
      .select('first_name', 'last_name', 'email', 'phone_number')
      .where({ user_id: req.user.sub }) // sub set by JWT (user_id)
      .first();

    if (!user) return res.sendStatus(404);
    
    // Format phone number for display
    const formattedUser = {
      ...user,
      phone_number: formatPhoneForDisplay(user.phone_number)
    };
    
    res.json(formattedUser);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// PUT /api/user/me
export async function updateProfile(req, res) {
  const { error, value } = profileSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ error: error.details.map(e => e.message).join(' ') });
  }

  try {
    const { first_name, last_name, phone_number } = value;
    
    // Normalize phone number before saving
    let normalizedPhone;
    try {
      normalizedPhone = normalizePhoneNumber(phone_number);
    } catch (phoneError) {
      return res.status(400).json({ error: phoneError.message });
    }

    const count = await db('users')
      .where({ user_id: req.user.sub })
      .update({ 
        first_name, 
        last_name, 
        phone_number: normalizedPhone, 
        updated_at: new Date() 
      });

    if (!count) return res.sendStatus(404);
    
    // Return formatted response
    const updatedUser = {
      first_name,
      last_name,
      phone_number: formatPhoneForDisplay(normalizedPhone)
    };
    
    res.json({ 
      message: 'Profile updated',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}