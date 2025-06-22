import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserFromToken(token)
    if (!user || user.role !== "Admin") {
      return NextResponse.json({ success: false, message: "Forbidden - Admin access required" }, { status: 403 })
    }

    console.log(`[S3 DEBUG] Admin ${user.name} requesting S3 debug info`)

    // Test the S3 service
    const { s3Service } = await import("@/lib/aws-s3")

    // Test connection
    const connectionTest = await s3Service.testConnection()

    // List files in bucket
    const filesList = await s3Service.listFiles()

    // List files in medical-reports folder
    const medicalReportsList = await s3Service.listFiles("medical-reports/")

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      bucket: process.env.AWS_S3_BUCKET || "diagnexus-medical-reports",
      region: process.env.AWS_REGION || "us-east-1",
      connection: connectionTest,
      allFiles: filesList,
      medicalReports: medicalReportsList,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ? "✓ Configured" : "✗ Missing",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? "✓ Configured" : "✗ Missing",
      },
    })
  } catch (error) {
    console.error("S3 debug error:", error)
    return NextResponse.json(
      {
        success: false,
        message: `S3 debug failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
