const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Users & Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, phone } = req.body;
    
    // Check existing
    const [existing] = await pool.query('SELECT id FROM app_users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

    const userId = uuidv4();
    await pool.query(
      'INSERT INTO app_users (id, email, password, phone) VALUES (?, ?, ?, ?)',
      [userId, email, password, phone]
    );

    res.json({ id: userId, email, phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT id FROM app_users WHERE email = ? AND password = ?', [email, password]);
    
    if (users.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    
    res.json({ id: users[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch user with relations
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const [users] = await pool.query('SELECT * FROM app_users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = users[0];
    
    // Get profiles
    const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    
    for (let p of profiles) {
      const [history] = await pool.query('SELECT * FROM watch_history WHERE profile_id = ? ORDER BY updated_at DESC', [p.id]);
      p.continueWatching = history.map(h => ({
        id: h.id,
        stream_id: h.stream_id,
        item: h.item, // MySQL json is auto parsed by mysql2
        progress: h.progress,
        duration: h.duration,
        percentage: h.percentage,
        updatedAt: h.updated_at
      }));

      // Get library
      const [library] = await pool.query('SELECT * FROM user_library WHERE profile_id = ?', [p.id]);
      p.library = library.map(l => ({
        id: l.id,
        stream_id: l.stream_id,
        item: l.item,
        rating: l.rating,
        in_collection: !!l.in_collection,
        updatedAt: l.updated_at
      }));
    }
    
    const mappedUser = {
      ...user,
      planId: user.plan_id,
      paymentStatus: user.payment_status,
      receiptImage: user.receipt_image,
      subscriptionEndDate: user.subscription_end_date,
      profiles: profiles
    };
    
    res.json(mappedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (Admin)
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM app_users ORDER BY created_at DESC');
    
    for (let user of users) {
      const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
      for (let p of profiles) {
        const [history] = await pool.query('SELECT * FROM watch_history WHERE profile_id = ? ORDER BY updated_at DESC', [p.id]);
        p.continueWatching = history.map(h => ({
          id: h.id,
          stream_id: h.stream_id,
          item: h.item,
          progress: h.progress,
          duration: h.duration,
          percentage: h.percentage,
          updatedAt: h.updated_at
        }));
      }
      user.profiles = profiles;
    }
    
    const mappedUsers = users.map(user => ({
      ...user,
      planId: user.plan_id,
      paymentStatus: user.payment_status,
      receiptImage: user.receipt_image,
      subscriptionEndDate: user.subscription_end_date
    }));
    
    res.json(mappedUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (Admin)
app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body; // { plan_id, payment_status, subscription_end_date }
    
    let promoCode = updates.promo_code;
    delete updates.promo_code; // Remove from updates as it's not a column in app_users
    
    // Verify promo code if sent
    if (promoCode) {
      const [codes] = await pool.query('SELECT * FROM promo_codes WHERE code = ?', [promoCode]);
      if (codes.length === 0) return res.status(400).json({ error: 'Invalid promo code' });
      
      // Mark as active since they used a code
      updates.payment_status = 'active';
      updates.subscription_end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Increment used count
      await pool.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?', [promoCode]);
    }

    if (updates.subscription_end_date) {
      updates.subscription_end_date = new Date(updates.subscription_end_date);
    }

    const keys = Object.keys(updates);
    if (keys.length === 0) return res.json({ success: true });

    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => updates[k]);
    values.push(userId);

    await pool.query(`UPDATE app_users SET ${setClause} WHERE id = ?`, values);
    
    // Auto-create default profile if payment is active
    if (updates.payment_status === 'active') {
      const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
      if (profiles.length === 0) {
        await pool.query(
          'INSERT INTO profiles (id, user_id, name, avatar) VALUES (?, ?, ?, ?)',
          [uuidv4(), userId, 'Main Profile', 'https://wallpapers.com/images/hd/netflix-profile-pictures-1000-x-1000-88wkdmjrorckekha.jpg']
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Profiles
app.post('/api/profiles', async (req, res) => {
  try {
    const { user_id, name, avatar } = req.body;

    // Check user plan and current profiles count
    const [users] = await pool.query('SELECT plan_id FROM app_users WHERE id = ?', [user_id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const planId = users[0].plan_id;
    let maxProfiles = 1;
    if (planId === 'sports') maxProfiles = 2;
    if (planId === 'premium') maxProfiles = 4;

    const [profiles] = await pool.query('SELECT COUNT(*) as count FROM profiles WHERE user_id = ?', [user_id]);
    if (profiles[0].count >= maxProfiles) {
      return res.status(403).json({ error: 'Maximum profile limit reached for your plan.' });
    }

    await pool.query(
      'INSERT INTO profiles (id, user_id, name, avatar) VALUES (?, ?, ?, ?)',
      [uuidv4(), user_id, name, avatar]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profiles/:id', async (req, res) => {
  try {
    const { name, avatar } = req.body;
    await pool.query(
      'UPDATE profiles SET name = ?, avatar = ? WHERE id = ?',
      [name, avatar, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/profiles/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM profiles WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Watch History
app.post('/api/watch-history', async (req, res) => {
  try {
    const { profile_id, stream_id, item, progress, duration, percentage } = req.body;
    
    if (percentage >= 95) {
      await pool.query('DELETE FROM watch_history WHERE profile_id = ? AND stream_id = ?', [profile_id, stream_id]);
      return res.json({ success: true });
    }

    await pool.query(`
      INSERT INTO watch_history (id, profile_id, stream_id, item, progress, duration, percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      item = VALUES(item), progress = VALUES(progress), duration = VALUES(duration), percentage = VALUES(percentage)
    `, [uuidv4(), profile_id, stream_id, JSON.stringify(item), progress, duration, percentage]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promo Codes
app.post('/api/promo/verify', async (req, res) => {
  try {
    const { code } = req.body;
    const [codes] = await pool.query('SELECT discount_percentage FROM promo_codes WHERE code = ?', [code]);
    if (codes.length === 0) return res.status(404).json({ error: 'Invalid promo code' });
    
    res.json({ discount: codes[0].discount_percentage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === Library Routes ===
app.post('/api/library/toggle-rating', async (req, res) => {
  try {
    const { profile_id, stream_id, item, rating } = req.body;
    const [rows] = await pool.query('SELECT * FROM user_library WHERE profile_id = ? AND stream_id = ?', [profile_id, stream_id]);
    
    if (rows.length > 0) {
      let newRating = rating;
      if (rows[0].rating === rating) {
        newRating = null; // Toggle off
      }
      if (newRating === null && !rows[0].in_collection) {
        await pool.query('DELETE FROM user_library WHERE id = ?', [rows[0].id]);
        return res.json({ status: 'removed' });
      } else {
        await pool.query('UPDATE user_library SET rating = ? WHERE id = ?', [newRating, rows[0].id]);
        return res.json({ status: 'updated', rating: newRating });
      }
    } else {
      if (rating === null) return res.json({ status: 'none' });
      const id = uuidv4();
      await pool.query(
        'INSERT INTO user_library (id, profile_id, stream_id, item, rating) VALUES (?, ?, ?, ?, ?)',
        [id, profile_id, stream_id, JSON.stringify(item), rating]
      );
      return res.json({ status: 'inserted', rating });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/library/toggle-collection', async (req, res) => {
  try {
    const { profile_id, stream_id, item } = req.body;
    const [rows] = await pool.query('SELECT * FROM user_library WHERE profile_id = ? AND stream_id = ?', [profile_id, stream_id]);
    
    if (rows.length > 0) {
      const newCollectionStatus = !rows[0].in_collection;
      if (!newCollectionStatus && !rows[0].rating) {
        await pool.query('DELETE FROM user_library WHERE id = ?', [rows[0].id]);
        return res.json({ status: 'removed', in_collection: false });
      } else {
        await pool.query('UPDATE user_library SET in_collection = ? WHERE id = ?', [newCollectionStatus, rows[0].id]);
        return res.json({ status: 'updated', in_collection: newCollectionStatus });
      }
    } else {
      const id = uuidv4();
      await pool.query(
        'INSERT INTO user_library (id, profile_id, stream_id, item, in_collection) VALUES (?, ?, ?, ?, ?)',
        [id, profile_id, stream_id, JSON.stringify(item), true]
      );
      return res.json({ status: 'inserted', in_collection: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Migration
app.post('/api/migrate', async (req, res) => {
  try {
    const localDb = req.body;
    if (!localDb || !localDb.users) return res.status(400).json({ error: 'Invalid data' });

    console.log(`Starting migration of ${localDb.users.length} users...`);

    for (let u of localDb.users) {
      // 1. Insert User
      const userId = u.id.includes('_') ? uuidv4() : u.id; // Handle old format IDs
      try {
        await pool.query(
          'INSERT INTO app_users (id, email, phone, password, plan_id, payment_status, receipt_image, subscription_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
          [userId, u.email, u.phone, u.password, u.planId, u.paymentStatus, u.receiptImage, u.subscriptionEndDate]
        );
      } catch (err) {
        console.error("Error inserting user:", u.email, err.message);
        continue;
      }

      // 2. Insert Profiles
      if (u.profiles) {
        for (let p of u.profiles) {
          const profileId = p.id;
          try {
            await pool.query(
              'INSERT INTO profiles (id, user_id, name, avatar) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
              [profileId, userId, p.name, p.avatar]
            );
          } catch (err) {
            console.error("Error inserting profile:", p.name, err.message);
            continue;
          }

          // 3. Insert Watch History
          if (p.continueWatching) {
            for (let w of p.continueWatching) {
              const streamId = String(w.stream_id || w.id);
              try {
                await pool.query(
                  'INSERT INTO watch_history (id, profile_id, stream_id, item, progress, duration, percentage) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
                  [uuidv4(), profileId, streamId, JSON.stringify(w.item), w.progress, w.duration, w.percentage]
                );
              } catch (err) {
                console.error("Error inserting watch history:", err.message);
              }
            }
          }
        }
      }
    }
    
    res.json({ success: true, message: 'Migration completed successfully!' });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
