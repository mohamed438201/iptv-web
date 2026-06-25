const pool = require('./db');

async function initDB() {
  try {
    console.log("Initializing database tables...");

    // 1. app_users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        password VARCHAR(255) NOT NULL,
        plan_id VARCHAR(50),
        payment_status VARCHAR(50),
        receipt_image TEXT,
        subscription_end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 2. profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 3. watch_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS watch_history (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        stream_id VARCHAR(255) NOT NULL,
        item JSON NOT NULL,
        progress FLOAT,
        duration FLOAT,
        percentage FLOAT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_profile_stream (profile_id, stream_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 4. user_library table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_library (
        id VARCHAR(36) PRIMARY KEY,
        profile_id VARCHAR(36) NOT NULL,
        stream_id VARCHAR(255) NOT NULL,
        item JSON NOT NULL,
        rating ENUM('like', 'dislike') NULL,
        in_collection BOOLEAN DEFAULT FALSE,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_library_item (profile_id, stream_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);

    // 5. promo_codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percentage INT NOT NULL,
        used_count INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `);
    
    await pool.query(`
      INSERT IGNORE INTO promo_codes (code, discount_percentage) VALUES ('FREE100', 100)
    `);

    console.log("Database initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

initDB();
