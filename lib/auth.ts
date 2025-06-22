import bcrypt from "bcryptjs"

export interface User {
  user_id: number
  role: "Admin" | "Doctor" | "Patient"
  name: string
  email: string
  is_active: boolean
}

export interface AuthResult {
  success: boolean
  user?: User
  token?: string
  message?: string
}

export async function hashPassword(password: string): Promise<string> {
  try {
    return await bcrypt.hash(password, 12) // Higher cost for production
  } catch (error) {
    console.error("[AUTH] Password hashing error:", error)
    throw new Error("Password hashing failed")
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error("[AUTH] Password verification error:", error)
    return false
  }
}

// Production token generation with JWT-like structure
export function generateToken(user: User): string {
  try {
    const payload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    }

    // In production, use proper JWT library
    const token = btoa(JSON.stringify(payload))
    return token
  } catch (error) {
    console.error("[AUTH] Token generation error:", error)
    throw new Error("Token generation failed")
  }
}

export function verifyToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    const payload = JSON.parse(atob(token))
    if (payload.exp < Date.now()) {
      console.log("[AUTH] Token expired")
      return null
    }
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    }
  } catch (error) {
    console.error("[AUTH] Token verification error:", error)
    return null
  }
}

// Database query function - will be injected from the API route
let queryFunction: ((text: string, params?: any[]) => Promise<any>) | null = null

export function setQueryFunction(fn: (text: string, params?: any[]) => Promise<any>) {
  queryFunction = fn
}

export async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  console.log("[AUTH] Starting production authentication for:", email)

  if (!email || !password) {
    return { success: false, message: "Email and password are required" }
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim()

  if (!queryFunction) {
    console.error("[AUTH] No database query function available")
    return { success: false, message: "Authentication service unavailable" }
  }

  try {
    console.log("[AUTH] Querying production database...")

    const result = await queryFunction(
      "SELECT user_id, role, name, email, password_hash, is_active FROM users WHERE LOWER(email) = $1",
      [normalizedEmail],
    )

    console.log("[AUTH] Database query completed:", { rowCount: result.rows.length })

    if (result.rows.length === 0) {
      console.log("[AUTH] User not found in production database")
      return { success: false, message: "Invalid email or password" }
    }

    const user = result.rows[0]
    console.log("[AUTH] User found in production database:", {
      id: user.user_id,
      email: user.email,
      role: user.role,
      active: user.is_active,
    })

    if (!user.is_active) {
      console.log("[AUTH] User account is inactive")
      return { success: false, message: "Account is inactive" }
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    console.log("[AUTH] Password verification result:", isValidPassword)

    if (!isValidPassword) {
      console.log("[AUTH] Invalid password for production user")
      return { success: false, message: "Invalid email or password" }
    }

    const userInfo: User = {
      user_id: user.user_id,
      role: user.role,
      name: user.name,
      email: user.email,
      is_active: user.is_active,
    }

    const token = generateToken(userInfo)
    console.log("[AUTH] Production authentication successful")

    // Log successful login to database
    try {
      await queryFunction("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
        user.user_id,
        btoa(token.substring(0, 32)),
        new Date(Date.now() + 24 * 60 * 60 * 1000),
      ])
    } catch (sessionError) {
      console.warn("[AUTH] Failed to log session:", sessionError)
      // Don't fail authentication if session logging fails
    }

    return {
      success: true,
      user: userInfo,
      token,
      message: "Authentication successful",
    }
  } catch (error) {
    console.error("[AUTH] Production authentication error:", error)
    return {
      success: false,
      message: "Authentication system error - please try again",
    }
  }
}

export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    console.log("[AUTH] Verifying production token...")

    const payload = verifyToken(token)
    if (!payload) {
      console.log("[AUTH] Invalid or expired token")
      return null
    }

    console.log("[AUTH] Token payload:", { userId: payload.userId, email: payload.email, role: payload.role })

    if (!queryFunction) {
      console.error("[AUTH] No database query function available for token verification")
      return null
    }

    try {
      const result = await queryFunction(
        "SELECT user_id, role, name, email, is_active FROM users WHERE user_id = $1 AND is_active = true",
        [payload.userId],
      )

      if (result.rows.length > 0) {
        console.log("[AUTH] User found in production database via token")
        return result.rows[0]
      } else {
        console.log("[AUTH] User not found or inactive in production database")
        return null
      }
    } catch (dbError) {
      console.error("[AUTH] Database token verification failed:", dbError)
      return null
    }
  } catch (error) {
    console.error("[AUTH] Token verification error:", error)
    return null
  }
}
