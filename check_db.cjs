const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function check() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || '135.125.196.203',
      user: process.env.DB_USER || 'adminmysqll',
      password: process.env.DB_PASS || 'XLb(226ba[<T',
      database: process.env.DB_NAME || 'iptv'
    });
    console.log("Connected to DB");
    const [rows] = await pool.query("SHOW TABLES");
    console.log("Tables:", rows);
    const [users] = await pool.query("SELECT id, email FROM app_users");
    console.log("Users in app_users:", users);
    pool.end();
  } catch (err) {
    console.error("DB Error:", err.message);
  }
}
check();
