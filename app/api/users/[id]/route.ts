import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken, setQueryFunction } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[USER UPDATE API] Processing update user request for ID:", params.id)

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Inject database query function if available
    let queryFunction: ((text: string, params?: any[]) => Promise<any>) | null = null
    try {
      const { query } = await import("@/lib/database")
      setQueryFunction(query)
      queryFunction = query
    } catch (dbImportError) {
      console.log("[USER UPDATE API] Database not available")
    }

    const currentUser = await getUserFromToken(token)
    if (!currentUser || currentUser.role !== "Admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const userId = Number.parseInt(params.id)
    const updates = await request.json()

    // For demo mode, return success but don't actually update
    if (!queryFunction) {
      console.log("[USER UPDATE API] Demo mode - simulating user update")
      return NextResponse.json({
        success: true,
        data: {
          UserId: userId,
          Role: updates.role || "Patient",
          Name: updates.name || "Updated User",
          Mail: updates.email || "updated@example.com",
          UpdatedBy: currentUser.user_id,
          UpdatedDate: new Date().toISOString(),
          IsActive: updates.is_active !== undefined ? updates.is_active : true,
        },
      })
    }

    // Database update logic
    try {
      let updateQuery = "UPDATE users SET updated_by = $1, updated_date = CURRENT_TIMESTAMP"
      const queryParams = [currentUser.user_id]
      let paramIndex = 2

      if (updates.name) {
        updateQuery += `, name = $${paramIndex}`
        queryParams.push(updates.name)
        paramIndex++
      }

      if (updates.email) {
        updateQuery += `, email = $${paramIndex}`
        queryParams.push(updates.email)
        paramIndex++
      }

      if (updates.role) {
        updateQuery += `, role = $${paramIndex}`
        queryParams.push(updates.role)
        paramIndex++
      }

      if (updates.password) {
        const { hashPassword } = await import("@/lib/auth")
        const passwordHash = await hashPassword(updates.password)
        updateQuery += `, password_hash = $${paramIndex}`
        queryParams.push(passwordHash)
        paramIndex++
      }

      if (typeof updates.is_active === "boolean") {
        updateQuery += `, is_active = $${paramIndex}`
        queryParams.push(updates.is_active)
        paramIndex++
      }

      updateQuery += ` WHERE user_id = $${paramIndex} RETURNING user_id, role, name, email, updated_by, updated_date, is_active`
      queryParams.push(userId)

      const result = await queryFunction(updateQuery, queryParams)

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
      }

      const updatedUser = result.rows[0]

      return NextResponse.json({
        success: true,
        data: {
          UserId: updatedUser.user_id,
          Role: updatedUser.role,
          Name: updatedUser.name,
          Mail: updatedUser.email,
          UpdatedBy: updatedUser.updated_by,
          UpdatedDate: updatedUser.updated_date,
          IsActive: updatedUser.is_active,
        },
      })
    } catch (dbError) {
      console.error("[USER UPDATE API] Database update failed:", dbError)
      return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 })
    }
  } catch (error) {
    console.error("[USER UPDATE API] Update user error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[USER DELETE API] Processing delete user request for ID:", params.id)

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Inject database query function if available
    let queryFunction: ((text: string, params?: any[]) => Promise<any>) | null = null
    try {
      const { query } = await import("@/lib/database")
      setQueryFunction(query)
      queryFunction = query
    } catch (dbImportError) {
      console.log("[USER DELETE API] Database not available")
    }

    const currentUser = await getUserFromToken(token)
    if (!currentUser || currentUser.role !== "Admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const userId = Number.parseInt(params.id)

    // For demo mode, return success but don't actually delete
    if (!queryFunction) {
      console.log("[USER DELETE API] Demo mode - simulating user deletion")
      return NextResponse.json({ success: true, message: "User deleted successfully" })
    }

    // Database deletion logic
    try {
      // Soft delete by setting is_active to false
      const result = await queryFunction(
        `
        UPDATE users 
        SET is_active = false, updated_by = $1, updated_date = CURRENT_TIMESTAMP
        WHERE user_id = $2
        RETURNING user_id
      `,
        [currentUser.user_id, userId],
      )

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, message: "User deleted successfully" })
    } catch (dbError) {
      console.error("[USER DELETE API] Database deletion failed:", dbError)
      return NextResponse.json({ success: false, message: "Failed to delete user" }, { status: 500 })
    }
  } catch (error) {
    console.error("[USER DELETE API] Delete user error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
