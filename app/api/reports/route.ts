import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken, setQueryFunction } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("[REPORTS API] Processing get reports request")

    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      console.log("[REPORTS API] No authorization token provided")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Inject database query function
    let queryFunction: ((text: string, params?: any[]) => Promise<any>) | null = null
    try {
      const { query } = await import("@/lib/database")
      setQueryFunction(query)
      queryFunction = query
      console.log("[REPORTS API] Database query function available")
    } catch (dbImportError) {
      console.error("[REPORTS API] Database not available:", dbImportError)
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      console.log("[REPORTS API] Invalid token")
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    console.log("[REPORTS API] Access granted for:", user.name, "Role:", user.role)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!queryFunction) {
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    try {
      console.log("[REPORTS API] Querying database for reports...")

      let queryText = `
        SELECT r.report_id, r.user_id, r.name, r.file_path, r.file_size, r.file_type, 
               r.comments, r.updated_by, r.updated_date, r.is_active, r.created_at,
               u.name as patient_name,
               updater.name as updated_by_name
        FROM reports r
        JOIN users u ON r.user_id = u.user_id
        LEFT JOIN users updater ON r.updated_by = updater.user_id
        WHERE r.is_active = true
      `
      const queryParams: any[] = []

      // Role-based filtering
      if (user.role === "Patient") {
        queryText += " AND r.user_id = $1"
        queryParams.push(user.user_id)
        console.log(`[REPORTS API] Filtering reports for patient: ${user.user_id}`)
      } else if (userId && (user.role === "Doctor" || user.role === "Admin")) {
        queryText += " AND r.user_id = $1"
        queryParams.push(Number.parseInt(userId))
        console.log(`[REPORTS API] Filtering reports for user: ${userId}`)
      } else {
        console.log(`[REPORTS API] Fetching all reports for ${user.role}`)
      }

      queryText += " ORDER BY r.created_at DESC"

      const result = await queryFunction(queryText, queryParams)

      const reports = result.rows.map((row: any) => ({
        ReportId: row.report_id,
        UserId: row.user_id,
        Name: row.name,
        Path: row.file_path, // This is the S3 key/path
        FileSize: row.file_size,
        FileType: row.file_type,
        Comments: row.comments,
        UpdatedBy: row.updated_by,
        UpdatedDate: row.updated_date,
        IsActive: row.is_active,
        PatientName: row.patient_name,
        UpdatedByName: row.updated_by_name,
        CreatedAt: row.created_at,
      }))

      console.log("[REPORTS API] Database query successful, returning", reports.length, "reports")
      return NextResponse.json({ success: true, data: reports })
    } catch (dbError) {
      console.error("[REPORTS API] Database query failed:", dbError)
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch reports from database",
          error: dbError instanceof Error ? dbError.message : "Database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[REPORTS API] Unexpected error:", error)
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
