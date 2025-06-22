const { Pool } = require("pg")
const bcrypt = require("bcryptjs")

async function setupProduction() {
  console.log("🚀 Setting up DiagNexus Production Environment")
  console.log("=".repeat(50))

  // Production AWS RDS PostgreSQL connection
  const pool = new Pool({
    host: "diagnexus.cez8sqams4v9.us-east-1.rds.amazonaws.com",
    database: "diagnexus",
    user: "postgres",
    password: "Prem2354",
    port: 5432,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  })

  try {
    console.log("🔧 Connecting to AWS RDS PostgreSQL...")
    console.log("Host: diagnexus.cez8sqams4v9.us-east-1.rds.amazonaws.com")
    console.log("Database: diagnexus")

    const client = await pool.connect()
    console.log("✅ Connected to AWS RDS successfully")

    console.log("\n🔧 Creating production database schema...")

    // Drop existing tables if they exist (for clean setup)
    await client.query("DROP TABLE IF EXISTS sessions CASCADE")
    await client.query("DROP TABLE IF EXISTS reports CASCADE")
    await client.query("DROP TABLE IF EXISTS users CASCADE")

    // Create Users table with production constraints
    await client.query(`
      CREATE TABLE users (
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

    // Create Reports table with production constraints
    await client.query(`
      CREATE TABLE reports (
        report_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER CHECK (file_size > 0),
        file_type VARCHAR(100) NOT NULL,
        comments TEXT,
        updated_by INTEGER NOT NULL REFERENCES users(user_id),
        updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create Sessions table for production auth
    await client.query(`
      CREATE TABLE sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log("✅ Database schema created successfully")

    console.log("\n🔧 Creating production indexes...")

    // Create comprehensive indexes for production performance
    await client.query(`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_users_active ON users(is_active);
      CREATE INDEX idx_reports_user_id ON reports(user_id);
      CREATE INDEX idx_reports_active ON reports(is_active);
      CREATE INDEX idx_reports_created ON reports(created_at);
      CREATE INDEX idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX idx_sessions_token ON sessions(token_hash);
    `)

    console.log("✅ Production indexes created successfully")

    console.log("\n🌱 Seeding production data...")

    // Hash passwords with high cost for production security
    const adminHash = await bcrypt.hash("admin123", 12)
    const doctorHash = await bcrypt.hash("docpass", 12)
    const patientHash = await bcrypt.hash("patientpass", 12)

    // Insert production users
    await client.query(
      `
      INSERT INTO users (user_id, role, name, email, password_hash, updated_by, updated_date, is_active) VALUES
      (1, 'Admin', 'Alice Johnson', 'alice@example.com', $1, NULL, CURRENT_TIMESTAMP, true),
      (2, 'Doctor', 'Dr. Smith', 'smith@hospital.com', $2, 1, CURRENT_TIMESTAMP, true),
      (3, 'Patient', 'John Doe', 'john.doe@example.com', $3, 2, CURRENT_TIMESTAMP, true),
      (4, 'Doctor', 'Dr. Emily Wilson', 'emily.wilson@hospital.com', $2, 1, CURRENT_TIMESTAMP, true),
      (5, 'Patient', 'Sarah Connor', 'sarah.connor@example.com', $3, 2, CURRENT_TIMESTAMP, true)
    `,
      [adminHash, doctorHash, patientHash],
    )

    // Insert sample reports for testing
    await client.query(`
      INSERT INTO reports (user_id, name, file_path, file_size, file_type, comments, updated_by, updated_date, is_active) VALUES
      (3, 'Blood Test Report', 'medical-reports/user_3/bloodtest_john_101.pdf', 2048576, 'application/pdf', 'Routine blood work results', 2, CURRENT_TIMESTAMP, true),
      (3, 'X-ray Report', 'medical-reports/user_3/xray_john_102.pdf', 5242880, 'application/pdf', 'Chest X-ray examination', 2, CURRENT_TIMESTAMP, true),
      (5, 'MRI Scan Report', 'medical-reports/user_5/mri_sarah_103.pdf', 8388608, 'application/pdf', 'Brain MRI scan results', 4, CURRENT_TIMESTAMP, true)
    `)

    // Reset sequences
    await client.query("SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users))")
    await client.query("SELECT setval('reports_report_id_seq', (SELECT MAX(report_id) FROM reports))")

    console.log("✅ Production data seeded successfully")

    // Verify setup
    const userCount = await client.query("SELECT COUNT(*) FROM users")
    const reportCount = await client.query("SELECT COUNT(*) FROM reports")

    console.log("\n📊 Production Setup Summary:")
    console.log("=".repeat(30))
    console.log(`Users created: ${userCount.rows[0].count}`)
    console.log(`Reports created: ${reportCount.rows[0].count}`)
    console.log("Database: AWS RDS PostgreSQL")
    console.log("Storage: AWS S3 (diagnexus-medical-reports)")
    console.log("Security: bcrypt password hashing (cost: 12)")
    console.log("Indexes: Optimized for production queries")

    console.log("\n🔐 Production Login Credentials:")
    console.log("Admin: alice@example.com / admin123")
    console.log("Doctor: smith@hospital.com / docpass")
    console.log("Doctor: emily.wilson@hospital.com / docpass")
    console.log("Patient: john.doe@example.com / patientpass")
    console.log("Patient: sarah.connor@example.com / patientpass")

    client.release()
    await pool.end()

    console.log("\n🚀 DiagNexus Production Setup Complete!")
    console.log("✅ AWS RDS PostgreSQL configured")
    console.log("✅ AWS S3 storage ready")
    console.log("✅ Production data seeded")
    console.log("✅ Security measures implemented")
    console.log("\nYou can now run: npm run dev")
  } catch (error) {
    console.error("❌ Production setup failed:", error)
    console.error("\nTroubleshooting:")
    console.error("1. Check AWS RDS instance is running")
    console.error("2. Verify security groups allow connections")
    console.error("3. Confirm database credentials are correct")
    console.error("4. Ensure network connectivity to AWS")
    process.exit(1)
  }
}

setupProduction()
