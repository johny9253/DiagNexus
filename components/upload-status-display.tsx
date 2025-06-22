"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Cloud, Database, FileText, CheckCircle } from "lucide-react"

interface UploadStatusProps {
  reportData?: {
    ReportId: number
    Name: string
    Path: string
    FileSize: number
    FileType: string
    S3Url: string
  }
}

export default function UploadStatusDisplay({ reportData }: UploadStatusProps) {
  if (!reportData) return null

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card className="healthcare-card border-success-200">
      <CardHeader className="bg-success-50 rounded-t-lg">
        <CardTitle className="text-success-800 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Upload Complete
        </CardTitle>
        <CardDescription className="text-success-700">
          Your medical report has been successfully processed and stored
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-primary-600" />
              <span className="font-medium text-clinical-900">Report Details</span>
            </div>
            <div className="pl-6 space-y-1 text-sm">
              <p>
                <span className="font-medium">Name:</span> {reportData.Name}
              </p>
              <p>
                <span className="font-medium">ID:</span> #{reportData.ReportId}
              </p>
              <p>
                <span className="font-medium">Size:</span> {formatFileSize(reportData.FileSize)}
              </p>
              <p>
                <span className="font-medium">Type:</span>
                <Badge variant="outline" className="ml-2">
                  {reportData.FileType}
                </Badge>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Cloud className="h-4 w-4 text-secondary-600" />
              <span className="font-medium text-clinical-900">Storage Details</span>
            </div>
            <div className="pl-6 space-y-1 text-sm">
              <p>
                <span className="font-medium">AWS S3 Path:</span>
              </p>
              <code className="text-xs bg-clinical-100 px-2 py-1 rounded block break-all">{reportData.Path}</code>
              <p>
                <span className="font-medium">Status:</span>
                <Badge className="ml-2 bg-success-100 text-success-800 border-success-200">Stored Securely</Badge>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="h-4 w-4 text-accent-600" />
            <span className="font-medium text-clinical-900">Database Record</span>
          </div>
          <div className="pl-6 text-sm text-clinical-600">
            <p>✅ File metadata saved to AWS RDS PostgreSQL</p>
            <p>✅ Report accessible to authorized healthcare providers</p>
            <p>✅ HIPAA-compliant storage and encryption</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
