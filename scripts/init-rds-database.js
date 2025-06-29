const { Pool } = require("pg")
const bcrypt = require("bcryptjs")

async function initializeRDSDatabase() {
  const adminPool = new Pool({
    host: "diagnexus.coxewow42tho.us-east-1.rds.amazonaws.com",
    database: "postgres", // start with default
    user: "postgres",
    password: "Prem2354",
    port: 5432,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log("🔍 Checking if 'diagnexus' database exists...")

    const check = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = 'diagnexus'")
    if (check.rows.length === 0) {
      console.log("📦 Creating 'diagnexus' database on RDS...")
      await adminPool.query("CREATE DATABASE diagnexus")
      console.log("✅ Database 'diagnexus' created successfully")
    } else {
      console.log("✅ Database 'diagnexus' already exists")
    }

    await adminPool.end()

    // Now connect to diagnexus database
    const pool = new Pool({
      host: "diagnexus.coxewow42tho.us-east-1.rds.amazonaws.com",
      database: "diagnexus",
      user: "postgres",
      password: "Prem2354",
      port: 5432,
      ssl: { rejectUnauthorized: false },
    })

    const client = await pool.connect()
    console.log("🔧 Connected to RDS 'diagnexus'")

    // Create tables
    console.log("📐 Creating tables if not exist...")
    await client.query(`
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

    await client.query(`
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
    `)

    // Seed data if empty
    const result = await client.query("SELECT COUNT(*) FROM users")
    if (parseInt(result.rows[0].count) === 0) {
      console.log("🌱 Seeding demo users and reports...")

      const adminHash = await bcrypt.hash("admin123", 10)
      const doctorHash = await bcrypt.hash("docpass", 10)
      const patientHash = await bcrypt.hash("patientpass", 10)

      await client.query(`
        INSERT INTO users (user_id, role, name, email, password_hash, updated_by, updated_date, is_active) VALUES
        (1, 'Admin', 'Alice Johnson', 'alice@example.com', $1, NULL, '2025-06-20T12:00:00Z', true),
        (2, 'Doctor', 'Dr. Smith', 'smith@hospital.com', $2, 1, '2025-06-20T12:30:00Z', true),
        (3, 'Patient', 'John Doe', 'john.doe@example.com', $3, 2, '2025-06-20T13:00:00Z', true)
      `, [adminHash, doctorHash, patientHash])

      await client.query(`
        INSERT INTO reports (report_id, user_id, name, file_path, file_size, file_type, comments, updated_by, updated_date, is_active) VALUES
        (101, 3, 'Blood Test Report', 'medical-reports/user_3/bloodtest_john_101.pdf', 2048576, 'application/pdf', 'Routine blood work results', 2, '2025-06-20T15:00:00Z', true),
        (102, 3, 'X-ray Report', 'medical-reports/user_3/xray_john_102.pdf', 5242880, 'application/pdf', 'Chest X-ray examination', 2, '2025-06-21T10:00:00Z', true)
      `)

      await client.query("SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users))")
      await client.query("SELECT setval('reports_report_id_seq', (SELECT MAX(report_id) FROM reports))")

      console.log("✅ Demo data inserted")
    } else {
      console.log("📊 Users already exist, skipping seeding")
    }

    client.release()
    await pool.end()

    console.log("🚀 RDS 'diagnexus' setup completed")
  } catch (error) {
    console.error("❌ RDS setup failed:", error)
    process.exit(1)
  }
}

initializeRDSDatabase()
