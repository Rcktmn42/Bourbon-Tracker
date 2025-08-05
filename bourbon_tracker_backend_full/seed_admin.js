// seed_admin.js
const bcrypt = require('bcrypt');
const db = require('./config/db');

const seedAdmin = async () => {
  const firstName = 'Jason';
  const lastName = 'Lewis';
  const email = 'jtlewis42@gmail.com';
  const phone = '239-834-4582';
  const password = 'admin123!'; // You can change this
  const role = 'admin';
  const isActive = 1;
  const isApproved = 1;

  try {
    const hash = await bcrypt.hash(password, 10);

    const stmt = db.prepare(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_active, is_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(firstName, lastName, email, phone, hash, role, isActive, isApproved, (err) => {
      if (err) {
        console.error('Error inserting admin user:', err.message);
      } else {
        console.log('✅ Admin user created successfully.');
      }

      stmt.finalize(() => {
        db.close((err) => {
          if (err) {
            console.error('Error closing database:', err.message);
          } else {
            console.log('✅ Database closed.');
          }
        });
      });
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    db.close();
  }
};

seedAdmin();
