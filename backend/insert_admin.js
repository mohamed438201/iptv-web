const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

async function insertAdmin() {
  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO app_users (id, email, password, plan_id, payment_status) VALUES (?, ?, ?, ?, ?)',
      [id, 'admin@iptv.com', 'Admin@123', 'premium', 'active']
    );
    console.log("Admin inserted successfully!");
    process.exit(0);
  } catch (err) {
    console.log("Admin may already exist or error:", err.message);
    process.exit(0);
  }
}

insertAdmin();
