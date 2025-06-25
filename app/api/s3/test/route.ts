import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken, setQueryFunction } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required - please log in first",
        },
        { status: 401 },
      )
    }

    // Inject database query function if available
    try {
      const { query } = await import("@/lib/database")
      setQueryFunction(query)
    } catch (dbImportError) {
      console.log("[S3 TEST] Database not available for user verification")
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid authentication token - please log in again",
        },
        { status: 401 },
      )
    }

    if (user.role !== "Admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Admin access required for S3 connection testing",
        },
        { status: 403 },
      )
    }

    console.log(`[S3 TEST] Admin ${user.name} testing production S3 connection`)

    // Test the real S3 service
    const { s3Service } = await import("@/lib/aws-s3")
    const testResult = await s3Service.testConnection()

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      timestamp: new Date().toISOString(),
      bucket: process.env.AWS_S3_BUCKET || "diagnexus-medi-reports",
      region: process.env.AWS_REGION || "us-east-1",
      mode: "production",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ? "✓ Configured" : "✗ Missing",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? "✓ Configured" : "✗ Missing",
      },
    })
  } catch (error) {
    console.error("S3 test error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `AWS S3 connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        mode: "production",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
