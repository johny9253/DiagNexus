import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { console } from "node:inspector/promises"

export interface DatabaseUser {
  user_id: number
  role: "Admin" | "Doctor" | "Patient"
  name: string
  email: string
  password_hash: string
  updated_by: number | null
  updated_date: string
  is_active: boolean
  created_at: string
}

export interface DatabaseReport {
  report_id: number
  user_id: number
  name: string
  file_path: string
  file_size: number
  file_type: string
  comments: string | null
  updated_by: number
  updated_date: string
  is_active: boolean
  created_at: string
}

// Production AWS RDS PostgreSQL connection configuration
let pool: Pool | null = null
let isConnected = false
let connectionError: string | null = null
let isInitializing = false

// Initialize connection pool with production settings and retry logic
async function initializePool(): Promise<Pool | null> {
  if (pool && isConnected) {
    console.log("[DB] Using existing connection pool")
    return pool
  }

  if (isInitializing) {
    console.log("[DB] Pool initialization already in progress, waiting...")
    // Wait for initialization to complete
    let attempts = 0
    while (isInitializing && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      attempts++
    }
    return pool
  }

  isInitializing = true

  try {
    const databaseUrl =
      process.env.DATABASE_URL ||
      "postgresql://postgres:Prem2354@diagnexus.coxewow42tho.us-east-1.rds.amazonaws.com:5432/diagnexus"

    console.log("[DB] Initializing new connection pool...")

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      min: 2, // Keep minimum connections alive
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      statement_timeout: 30000,
      query_timeout: 30000,
      acquireTimeoutMillis: 15000,
    })

    // Handle pool errors
    pool.on("error", (err) => {
      console.error("[DB] Pool error:", err)
      connectionError = err.message
      isConnected = false
    })

    pool.on("connect", (client) => {
      console.log("[DB] New client connected to pool")
    })

    pool.on("remove", (client) => {
      console.log("[DB] Client removed from pool")
    })

    // Test the connection with retry logic
    await testConnectionWithRetry(pool)

    console.log("[DB] Production connection pool initialized successfully")
    isConnected = true
    connectionError = null
    return pool
  } catch (error) {
    console.error("[DB] Failed to initialize connection pool:", error)
    connectionError = error instanceof Error ? error.message : "Pool initialization failed"
    isConnected = false
    pool = null
    return null
  } finally {
    isInitializing = false
  }
}

// Test connection with retry logic
async function testConnectionWithRetry(testPool: Pool, maxRetries = 3): Promise<void> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[DB] Testing connection (attempt ${attempt}/${maxRetries})...`)
      console.log('Test done',pool)

      const testClient = await Promise.race([
        testPool.connect(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 10000)),
      ])

      await testClient.query("SELECT 1 as test")
      testClient.release()

      console.log(`[DB] Connection test successful on attempt ${attempt}`)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")
      console.error(`[DB] Connection test failed (attempt ${attempt}/${maxRetries}):`, lastError.message)

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // Exponential backoff
        console.log(`[DB] Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Connection test failed after all retries")
}

// Ensure database is initialized and tables exist
async function ensureDatabaseReady(): Promise<boolean> {
  try {
    const dbPool = await initializePool()
    if (!dbPool || !isConnected) {
      throw new Error("Failed to initialize database pool")
    }

    // Ensure tables exist
    await createTablesIfNeeded(dbPool)
    await seedDemoDataIfNeeded(dbPool)

    return true
  } catch (error: any) {
    console.error("[DB] Database initialization error:", error.message)
    connectionError = error.message
    isConnected = false
    return false
  }
}

async function createTablesIfNeeded(dbPool: Pool) {
  const client = await dbPool.connect()
  try {
    // Check if tables exist
    const tablesExist = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'reports', 'sessions')
    `)

    if (Number.parseInt(tablesExist.rows[0].count) < 3) {
      console.log("🔧 Creating missing database tables...")

      // Create Users table
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

      // Create Reports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
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

      // Create Sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
        CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
        CREATE INDEX IF NOT EXISTS idx_reports_active ON reports(is_active);
        CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
      `)

      console.log("✅ Database tables created successfully")
    }
  } finally {
    client.release()
  }
}

async function seedDemoDataIfNeeded(dbPool: Pool) {
  const client = await dbPool.connect()
  try {
    // Check if demo data exists
    const userCount = await client.query("SELECT COUNT(*) FROM users")
    if (Number.parseInt(userCount.rows[0].count) === 0) {
      console.log("🌱 Seeding demo data...")

      // Hash passwords
      const adminHash = await bcrypt.hash("admin123", 12)
      const doctorHash = await bcrypt.hash("docpass", 12)
      const patientHash = await bcrypt.hash("patientpass", 12)

      // Insert demo users
      await client.query(
        `
        INSERT INTO users (user_id, role, name, email, password_hash, updated_by, updated_date, is_active) VALUES
        (1, 'Admin', 'Alice Johnson', 'alice@example.com', $1, NULL, CURRENT_TIMESTAMP, true),
        (2, 'Doctor', 'Dr. Smith', 'smith@hospital.com', $2, 1, CURRENT_TIMESTAMP, true),
        (3, 'Patient', 'John Doe', 'john.doe@example.com', $3, 2, CURRENT_TIMESTAMP, true)
        ON CONFLICT (email) DO NOTHING
      `,
        [adminHash, doctorHash, patientHash],
      )

      // Insert demo reports
      await client.query(`
        INSERT INTO reports (report_id, user_id, name, file_path, file_size, file_type, comments, updated_by, updated_date, is_active) VALUES
        (101, 3, 'Blood Test Report', 'medical-reports/user_3/bloodtest_john_101.pdf', 2048576, 'application/pdf', 'Routine blood work results', 2, CURRENT_TIMESTAMP, true),
        (102, 3, 'X-ray Report', 'medical-reports/user_3/xray_john_102.pdf', 5242880, 'application/pdf', 'Chest X-ray examination', 2, CURRENT_TIMESTAMP, true)
        ON CONFLICT (report_id) DO NOTHING
      `)

      // Reset sequences
      await client.query("SELECT setval('users_user_id_seq', (SELECT COALESCE(MAX(user_id), 1) FROM users))")
      await client.query("SELECT setval('reports_report_id_seq', (SELECT COALESCE(MAX(report_id), 1) FROM reports))")

      console.log("✅ Demo data seeded successfully")
    }
  } finally {
    client.release()
  }
}

// Enhanced query function with retry logic
export async function query(text: string, params?: any[], retries = 2): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      // Ensure database is ready
      const isReady = await ensureDatabaseReady()
      if (!isReady || !pool) {
        throw new Error(`Database not ready: ${connectionError || "Unknown error"}`)
      }

      const client = await pool.connect()
      try {
        const start = Date.now()
        const result = await client.query(text, params)
        const duration = Date.now() - start
        console.log(`[DB] Query executed successfully in ${duration}ms (attempt ${attempt})`)
        return result
      } finally {
        client.release()
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown query error")
      console.error(`[DB] Query error (attempt ${attempt}/${retries + 1}):`, lastError.message)

      if (attempt <= retries) {
        // Reset connection on certain errors
        if (lastError.message.includes("connection") || lastError.message.includes("timeout")) {
          console.log("[DB] Resetting connection pool due to connection error...")
          isConnected = false
          pool = null
        }

        const delay = Math.min(1000 * attempt, 3000)
        console.log(`[DB] Retrying query in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("Query failed after all retries")
}

export async function getClient() {
  const isReady = await ensureDatabaseReady()
  if (!isReady || !pool) {
    throw new Error(`Database not ready: ${connectionError || "Unknown error"}`)
  }
  return await pool.connect()
}

export function getDatabaseStatus() {
  return {
    connected: isConnected,
    error: connectionError,
    host: "diagnexus.coxewow42tho.us-east-1.rds.amazonaws.com",
    database: "diagnexus",
    initializing: isInitializing,
    pool: pool
      ? {
          totalCount: pool.totalCount,
          idleCount: pool.idleCount,
          waitingCount: pool.waitingCount,
        }
      : null,
  }
}

// Warm up the connection pool on module load
setTimeout(async () => {
  try {
    console.log("[DB] Warming up connection pool...")
    await ensureDatabaseReady()
    console.log("[DB] Connection pool warmed up successfully")
  } catch (error) {
    console.error("[DB] Failed to warm up connection pool:", error)
  }
}, 100)

// Graceful shutdown
process.on("SIGINT", async () => {
  if (pool) {
    console.log("[DB] Closing database pool...")
    await pool.end()
    console.log("[DB] Database pool closed")
  }
  process.exit(0)
})

export default pool
