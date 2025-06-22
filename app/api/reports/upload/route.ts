import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken, setQueryFunction } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("[UPLOAD API] Processing production file upload request")

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
      console.log("[UPLOAD API] Database query function available")
    } catch (dbImportError) {
      console.error("[UPLOAD API] Database not available:", dbImportError)
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const name = formData.get("name") as string
    const comments = formData.get("comments") as string
    const targetUserId = formData.get("userId") ? Number.parseInt(formData.get("userId") as string) : user.user_id

    if (!file || !name) {
      return NextResponse.json({ success: false, message: "File and name are required" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Only PDF and images are allowed." },
        { status: 400 },
      )
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "File size too large. Maximum 10MB allowed." },
        { status: 400 },
      )
    }

    // Role-based access control
    if (user.role === "Patient" && targetUserId !== user.user_id) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    console.log(`[UPLOAD API] Processing upload for user ${targetUserId}`)
    console.log(`[UPLOAD API] File: ${file.name} (${file.size} bytes, ${file.type})`)

    // Generate S3 key with proper structure
    const { s3Service } = await import("@/lib/aws-s3")
    const s3Key = s3Service.generateUploadKey(targetUserId, file.name)

    console.log(`[UPLOAD API] Generated S3 key: ${s3Key}`)

    // Upload to AWS S3
    const uploadResult = await s3Service.uploadFile(file, s3Key)
    if (!uploadResult.success) {
      console.error(`[UPLOAD API] S3 upload failed: ${uploadResult.error}`)
      return NextResponse.json(
        {
          success: false,
          message: `File upload to S3 failed: ${uploadResult.error}`,
        },
        { status: 500 },
      )
    }

    console.log(`[UPLOAD API] S3 upload successful: ${uploadResult.url}`)

    // Save file metadata to database
    if (!queryFunction) {
      return NextResponse.json({ success: false, message: "Database service unavailable" }, { status: 500 })
    }

    try {
      const result = await queryFunction(
        `
        INSERT INTO reports (user_id, name, file_path, file_size, file_type, comments, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING report_id, user_id, name, file_path, file_size, file_type, comments, updated_by, updated_date, is_active, created_at
      `,
        [targetUserId, name, s3Key, file.size, file.type, comments || null, user.user_id],
      )

      const newReport = result.rows[0]
      console.log(`[UPLOAD API] Database record created: Report ID ${newReport.report_id}`)
      console.log(`[UPLOAD API] S3 file path saved: ${newReport.file_path}`)

      return NextResponse.json({
        success: true,
        message: "Report uploaded successfully to S3 and saved to database",
        data: {
          ReportId: newReport.report_id,
          UserId: newReport.user_id,
          Name: newReport.name,
          Path: newReport.file_path, // This is the S3 key
          FileSize: newReport.file_size,
          FileType: newReport.file_type,
          Comments: newReport.comments,
          UpdatedBy: newReport.updated_by,
          UpdatedDate: newReport.updated_date,
          IsActive: newReport.is_active,
          S3Url: uploadResult.url, // Full S3 URL for reference
        },
      })
    } catch (dbError) {
      console.error(`[UPLOAD API] Database save failed:`, dbError)

      // If database save fails, try to clean up S3 file
      try {
        await s3Service.deleteFile(s3Key)
        console.log(`[UPLOAD API] Cleaned up S3 file after database error`)
      } catch (cleanupError) {
        console.error(`[UPLOAD API] Failed to cleanup S3 file:`, cleanupError)
      }

      return NextResponse.json(
        {
          success: false,
          message: "Failed to save file metadata to database",
          error: dbError instanceof Error ? dbError.message : "Database error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[UPLOAD API] Upload error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error during upload",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
