// Database initialization script
// Ensures all tables exist on startup

async function initDatabase(pool) {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create lists table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        occasion_date DATE,
        share_code VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        list_id INTEGER REFERENCES lists(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2),
        original_url TEXT,
        affiliate_url TEXT,
        domain VARCHAR(255),
        image_url TEXT,
        notes TEXT,
        is_top_choice BOOLEAN DEFAULT FALSE,
        claimed_at TIMESTAMP,
        claimer_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create session table for connect-pg-simple
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        PRIMARY KEY ("sid")
      )
    `);

    // Create index on session expire
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);

    // Add claimer_name column if it doesn't exist (migration)
    await pool.query(`
      ALTER TABLE items ADD COLUMN IF NOT EXISTS claimer_name VARCHAR(255)
    `).catch(() => {
      // Column might already exist, ignore error
    });

    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  }
}

module.exports = initDatabase;
