import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken, setQueryFunction } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[DOWNLOAD API] Processing production download request for report:", params.id)

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
      console.log("[DOWNLOAD API] Database query function available")
    } catch (dbImportError) {
      console.error("[DOWNLOAD API] Database not available:", dbImportError)
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const reportId = Number.parseInt(params.id)

    if (!queryFunction) {
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    // Get report metadata from database
    let report: any = null
    try {
      const result = await queryFunction(
        `
        SELECT r.report_id, r.user_id, r.name, r.file_path, r.file_type, r.file_size, r.is_active,
               u.name as patient_name
        FROM reports r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.report_id = $1 AND r.is_active = true
      `,
        [reportId],
      )

      if (result.rows.length > 0) {
        report = result.rows[0]
        console.log("[DOWNLOAD API] Report found in database:")
        console.log(`[DOWNLOAD API] - Report ID: ${report.report_id}`)
        console.log(`[DOWNLOAD API] - Patient: ${report.patient_name}`)
        console.log(`[DOWNLOAD API] - S3 File Path: ${report.file_path}`)
        console.log(`[DOWNLOAD API] - File Type: ${report.file_type}`)
        console.log(`[DOWNLOAD API] - File Size: ${report.file_size} bytes`)
      } else {
        console.log("[DOWNLOAD API] Report not found in database")
        return NextResponse.json({ success: false, message: "Report not found" }, { status: 404 })
      }
    } catch (dbError) {
      console.error("[DOWNLOAD API] Database query failed:", dbError)
      return NextResponse.json({ success: false, message: "Database query failed" }, { status: 500 })
    }

    // Role-based access control
    if (user.role === "Patient" && report.user_id !== user.user_id) {
      console.log(
        `[DOWNLOAD API] Access denied: Patient ${user.user_id} trying to access report for user ${report.user_id}`,
      )
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    // Check if user has permission to download
    const hasPermission =
      user.role === "Admin" || user.role === "Doctor" || (user.role === "Patient" && report.user_id === user.user_id)

    if (!hasPermission) {
      console.log(`[DOWNLOAD API] Access denied: ${user.role} user ${user.user_id} lacks permission`)
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    console.log(`[DOWNLOAD API] User ${user.user_id} (${user.role}) authorized to download report ${reportId}`)
    console.log(`[DOWNLOAD API] Downloading from S3 key: ${report.file_path}`)

    // Check if file exists in S3 first
    const { s3Service } = await import("@/lib/aws-s3")

    // List files to verify the file exists
    const listResult = await s3Service.listFiles(report.file_path)
    if (!listResult.success || !listResult.files?.includes(report.file_path)) {
      console.error(`[DOWNLOAD API] File not found in S3: ${report.file_path}`)
      console.log(`[DOWNLOAD API] Available files:`, listResult.files?.slice(0, 5))
      return NextResponse.json(
        {
          success: false,
          message: `File not found in S3 storage: ${report.file_path}`,
          availableFiles: listResult.files?.slice(0, 5),
        },
        { status: 404 },
      )
    }

    // Download from AWS S3 using the file_path stored in database
    console.log(`[DOWNLOAD API] Attempting to download from S3...`)
    const downloadResult = await s3Service.downloadFile(report.file_path)

    if (!downloadResult.success || !downloadResult.data) {
      console.error(`[DOWNLOAD API] S3 download failed: ${downloadResult.error}`)
      return NextResponse.json(
        {
          success: false,
          message: `File download from S3 failed: ${downloadResult.error}`,
          s3Key: report.file_path,
        },
        { status: 500 },
      )
    }

    console.log(`[DOWNLOAD API] S3 download successful: ${downloadResult.data.length} bytes`)
    console.log(`[DOWNLOAD API] Content type: ${downloadResult.contentType}`)

    // Verify we got actual file content
    if (downloadResult.data.length === 0) {
      console.error(`[DOWNLOAD API] Downloaded file is empty`)
      return NextResponse.json({ success: false, message: "Downloaded file is empty" }, { status: 500 })
    }

    // Determine file extension for proper filename
    const fileExtension =
      report.file_type === "application/pdf"
        ? "pdf"
        : report.file_type === "image/jpeg"
          ? "jpg"
          : report.file_type === "image/png"
            ? "png"
            : "file"

    const fileName = `${report.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.${fileExtension}`

    console.log(`[DOWNLOAD API] Sending file: ${fileName} (${downloadResult.data.length} bytes)`)

    // Log download activity to database
    try {
      await queryFunction("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)", [
        user.user_id,
        `download_${reportId}_${Date.now()}`,
        new Date(Date.now() + 1000),
      ])
    } catch (logError) {
      console.warn("[DOWNLOAD API] Failed to log download activity:", logError)
      // Don't fail the download if logging fails
    }

    // Return the actual file from S3 with appropriate headers
    return new NextResponse(downloadResult.data, {
      headers: {
        "Content-Type": downloadResult.contentType || report.file_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": downloadResult.data.length.toString(),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "X-Report-ID": report.report_id.toString(),
        "X-Patient-Name": report.patient_name,
        "X-S3-Key": report.file_path,
        "X-File-Source": "AWS-S3",
        "X-Download-Time": new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[DOWNLOAD API] Download error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error during download",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
