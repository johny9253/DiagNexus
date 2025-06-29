const { Pool } = require("pg")

async function initializeDatabase() {
  // First connect to postgres database to create diagnexus database
  const adminPool = new Pool({
    host: "localhost",
    database: "postgres",
    user: "postgres",
    password: "Prem@2354",
    port: 5432,
  })

  try {
    console.log("🔧 Checking if DiagNexus database exists...")

    // Check if database exists
    const dbCheck = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'diagnexus'")

    if (dbCheck.rows.length === 0) {
      console.log("📦 Creating DiagNexus database...")
      await adminPool.query("CREATE DATABASE diagnexus")
      console.log("✅ DiagNexus database created successfully")
    } else {
      console.log("✅ DiagNexus database already exists")
    }

    await adminPool.end()

    // Now connect to diagnexus database
    const diagPool = new Pool({
      host: "localhost",
      database: "diagnexus",
      user: "postgres",
      password: "Prem@2354",
      port: 5432,
    })

    console.log("🔧 Setting up database tables...")

    // Create tables
    await diagPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Doctor', 'Patient')),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        updated_by INTEGER REFERENCES users(user_id),
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await diagPool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        file_type VARCHAR(100),
        comments TEXT,
        updated_by INTEGER NOT NULL REFERENCES users(user_id),
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes
    await diagPool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
    `)

    console.log("✅ Database setup completed successfully")
    console.log("🚀 You can now start the DiagNexus application")

    await diagPool.end()
  } catch (error) {
    console.error("❌ Database setup failed:", error)
    process.exit(1)
  }
}

initializeDatabase()
