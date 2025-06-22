import { type NextRequest, NextResponse } from "next/server"
import { authenticateUser, setQueryFunction } from "@/lib/auth"

export async function POST(request: NextRequest) {
  // Set proper headers for JSON response
  const headers = {
    "Content-Type": "application/json",
  }

  try {
    console.log("[LOGIN API] Processing login request")

    // Inject database query function if available
    try {
      const { query } = await import("@/lib/database")
      setQueryFunction(query)
      console.log("[LOGIN API] Database query function injected")
    } catch (dbImportError) {
      console.log("[LOGIN API] Database not available, using demo mode only")
    }

    let body
    try {
      body = await request.json()
      console.log("[LOGIN API] Request body received:", { email: body.email, hasPassword: !!body.password })
    } catch (parseError) {
      console.error("[LOGIN API] Failed to parse request body:", parseError)
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request format - expected JSON",
          error: "INVALID_JSON",
        },
        { status: 400, headers },
      )
    }

    const { email, password } = body

    if (!email || !password) {
      console.log("[LOGIN API] Missing credentials")
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
          error: "MISSING_CREDENTIALS",
        },
        { status: 400, headers },
      )
    }

    console.log("[LOGIN API] Attempting authentication for:", email)

    let authResult
    try {
      authResult = await authenticateUser(email, password)
      console.log("[LOGIN API] Authentication result:", {
        success: authResult.success,
        hasUser: !!authResult.user,
        message: authResult.message,
      })
    } catch (authError) {
      console.error("[LOGIN API] Authentication error:", authError)
      return NextResponse.json(
        {
          success: false,
          message: "Authentication service temporarily unavailable",
          error: "AUTH_SERVICE_ERROR",
          details: authError instanceof Error ? authError.message : "Unknown auth error",
        },
        { status: 500, headers },
      )
    }

    if (!authResult.success) {
      console.log("[LOGIN API] Authentication failed:", authResult.message)
      return NextResponse.json(
        {
          success: false,
          message: authResult.message || "Invalid credentials",
          error: "INVALID_CREDENTIALS",
        },
        { status: 401, headers },
      )
    }

    if (!authResult.user) {
      console.log("[LOGIN API] No user data returned")
      return NextResponse.json(
        {
          success: false,
          message: "Authentication failed - no user data",
          error: "NO_USER_DATA",
        },
        { status: 401, headers },
      )
    }

    console.log("[LOGIN API] Login successful for user:", authResult.user.name)

    // Create response with user data
    const userData = {
      UserId: authResult.user.user_id,
      Role: authResult.user.role,
      Name: authResult.user.name,
      Mail: authResult.user.email,
      IsActive: authResult.user.is_active,
      UpdatedDate: new Date().toISOString(),
      Password: "", // Never send password back
      UpdatedBy: null,
    }

    const responseHeaders = { ...headers }

    // Set token in header for client-side storage
    if (authResult.token) {
      responseHeaders["X-Auth-Token"] = authResult.token
      console.log("[LOGIN API] Auth token set in response header")
    }

    const response = NextResponse.json(
      {
        success: true,
        data: userData,
        message: "Login successful",
      },
      { status: 200, headers: responseHeaders },
    )

    return response
  } catch (error) {
    console.error("[LOGIN API] Unexpected error:", error)

    // Always return JSON, even for unexpected errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error during login",
        error: "INTERNAL_ERROR",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers },
    )
  }
}
