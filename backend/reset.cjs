const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || '135.125.196.203',
      user: process.env.DB_USER || 'adminmysqll',
      password: process.env.DB_PASS || 'XLb(226ba[<T',
      database: process.env.DB_NAME || 'iptv'
    });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin@123', salt);
    await pool.query('UPDATE app_users SET password = ? WHERE email = ?', [hash, 'admin@iptv.com']);
    console.log('Password reset to Admin@123');
    pool.end();
  } catch(e) {
    console.error(e);
  }
}
run();
