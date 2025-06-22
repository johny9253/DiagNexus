import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken, setQueryFunction } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("[USERS API] Processing get users request")

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      console.log("[USERS API] No authorization token provided")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Inject database query function
    let queryFunction: ((text: string, params?: any[]) => Promise<any>) | null = null
    try {
      const { query } = await import("@/lib/database")
      setQueryFunction(query)
      queryFunction = query
      console.log("[USERS API] Database query function available")
    } catch (dbImportError) {
      console.error("[USERS API] Database not available:", dbImportError)
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    const user = await getUserFromToken(token)
    if (!user || user.role !== "Admin") {
      console.log("[USERS API] Access denied - not admin user")
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    console.log("[USERS API] Admin access granted for:", user.name)

    if (!queryFunction) {
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    try {
      console.log("[USERS API] Querying database for all users...")
      const result = await queryFunction(`
        SELECT user_id, role, name, email, updated_by, updated_date, is_active, created_at
        FROM users 
        WHERE is_active = true
        ORDER BY created_at DESC
      `)

      const users = result.rows.map((row: any) => ({
        UserId: row.user_id,
        Role: row.role,
        Name: row.name,
        Mail: row.email,
        UpdatedBy: row.updated_by,
        UpdatedDate: row.updated_date,
        IsActive: row.is_active,
      }))

      console.log("[USERS API] Database query successful, returning", users.length, "users")
      return NextResponse.json({ success: true, data: users })
    } catch (dbError) {
      console.error("[USERS API] Database query failed:", dbError)
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch users from database",
          error: dbError instanceof Error ? dbError.message : "Database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[USERS API] Unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[USERS API] Processing create user request")

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Inject database query function
    let queryFunction: ((text: string, params?: any[]) => Promise<any>) | null = null
    try {
      const { query } = await import("@/lib/database")
      setQueryFunction(query)
      queryFunction = query
    } catch (dbImportError) {
      console.error("[USERS API] Database not available:", dbImportError)
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    const currentUser = await getUserFromToken(token)
    if (!currentUser || currentUser.role !== "Admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const { role, name, email, password } = await request.json()

    if (!role || !name || !email || !password) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 })
    }

    if (!queryFunction) {
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    try {
      // Check if email already exists
      const existingUser = await queryFunction("SELECT user_id FROM users WHERE email = $1", [email])
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ success: false, message: "Email already exists" }, { status: 400 })
      }

      const { hashPassword } = await import("@/lib/auth")
      const passwordHash = await hashPassword(password)

      const result = await queryFunction(
        `
        INSERT INTO users (role, name, email, password_hash, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id, role, name, email, updated_by, updated_date, is_active
      `,
        [role, name, email, passwordHash, currentUser.user_id],
      )

      const newUser = result.rows[0]

      return NextResponse.json({
        success: true,
        data: {
          UserId: newUser.user_id,
          Role: newUser.role,
          Name: newUser.name,
          Mail: newUser.email,
          UpdatedBy: newUser.updated_by,
          UpdatedDate: newUser.updated_date,
          IsActive: newUser.is_active,
        },
      })
    } catch (dbError) {
      console.error("[USERS API] Database user creation failed:", dbError)
      return NextResponse.json({ success: false, message: "Failed to create user" }, { status: 500 })
    }
  } catch (error) {
    console.error("[USERS API] Create user error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
