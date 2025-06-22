import { NextResponse } from "next/server"
import { getDatabaseStatus } from "@/lib/database"

export async function GET() {
  try {
    const status = getDatabaseStatus()

    return NextResponse.json({
      connected: status.connected,
      error: status.error,
      host: status.host,
      database: status.database,
      initializing: status.initializing,
      type: "AWS RDS PostgreSQL",
      timestamp: new Date().toISOString(),
      pool: status.pool,
      warmupAdvice: status.connected
        ? "Connection pool is ready"
        : "First-time connections may take 10-15 seconds. Please wait and refresh.",
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
      host: "diagnexus.cez8sqams4v9.us-east-1.rds.amazonaws.com",
      database: "diagnexus",
      initializing: false,
      type: "AWS RDS PostgreSQL",
      timestamp: new Date().toISOString(),
      warmupAdvice: "Connection failed. Check RDS instance status and security groups.",
    })
  }
}
