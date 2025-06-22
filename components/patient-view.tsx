"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/contexts/auth-context"
import { apiService } from "@/lib/api"
import type { Report } from "@/types"
import { Upload, Loader2, CheckCircle, FileText, Calendar, Shield, Download, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function PatientView() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [reportName, setReportName] = useState("")
  const [comments, setComments] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState("")

  // Real-time reports state
  const [myReports, setMyReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [reportsError, setReportsError] = useState("")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    fetchMyReports()
  }, [])

  const fetchMyReports = async () => {
    if (!user) return

    setLoadingReports(true)
    setReportsError("")

    try {
      console.log("[PATIENT VIEW] Fetching reports for patient:", user.UserId)
      const response = await apiService.getReports(user.UserId)

      if (response.success && response.data) {
        console.log("[PATIENT VIEW] Received", response.data.length, "reports")
        setMyReports(response.data)
      } else {
        setReportsError(response.message || "Failed to fetch reports")
      }
    } catch (error) {
      console.error("[PATIENT VIEW] Error fetching reports:", error)
      setReportsError("Failed to fetch your reports")
    } finally {
      setLoadingReports(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile)
        setError("")
      } else {
        setError("Please select a PDF or image file (JPEG, PNG)")
        setFile(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !reportName.trim() || !user) {
      setError("Please fill in all required fields")
      return
    }

    setIsUploading(true)
    setError("")
    setUploadSuccess(false)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", reportName.trim())
      formData.append("comments", comments.trim())
      formData.append("userId", user.UserId.toString())

      console.log("[PATIENT VIEW] Uploading report:", reportName)
      const response = await apiService.uploadReport(formData)

      if (response.success) {
        console.log("[PATIENT VIEW] Upload successful")
        setUploadSuccess(true)
        setFile(null)
        setReportName("")
        setComments("")

        // Reset file input
        const fileInput = document.getElementById("file") as HTMLInputElement
        if (fileInput) fileInput.value = ""

        // Refresh reports list to show new upload
        await fetchMyReports()
      } else {
        setError(response.message || "Upload failed")
      }
    } catch (error) {
      console.error("[PATIENT VIEW] Upload error:", error)
      setError("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (reportId: number, reportName: string) => {
    setDownloadingId(reportId)

    try {
      console.log(`[PATIENT VIEW] Downloading report ${reportId}: ${reportName}`)
      const blob = await apiService.downloadReport(reportId)

      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${reportName.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log(`[PATIENT VIEW] Download successful`)
      } else {
        setError("Failed to download report")
      }
    } catch (error) {
      console.error(`[PATIENT VIEW] Download error:`, error)
      setError("Failed to download report")
    } finally {
      setDownloadingId(null)
    }
  }

  const getStatusBadge = (report: Report) => {
    // Determine status based on when it was last updated and by whom
    const isRecentUpload = new Date(report.CreatedAt || report.UpdatedDate).getTime() > Date.now() - 24 * 60 * 60 * 1000
    const wasUpdatedByDoctor = report.UpdatedBy !== report.UserId

    if (isRecentUpload && !wasUpdatedByDoctor) {
      return <Badge className="bg-warning-100 text-warning-800 border-warning-200">Pending Review</Badge>
    } else if (wasUpdatedByDoctor) {
      return <Badge className="bg-success-100 text-success-800 border-success-200">Reviewed</Badge>
    } else {
      return <Badge className="bg-clinical-100 text-clinical-800 border-clinical-200">Uploaded</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-clinical-200 pb-4">
        <h2 className="text-2xl font-bold text-clinical-900">DiagNexus Report Upload</h2>
        <p className="text-clinical-600 mt-1">
          Securely upload your medical reports through DiagNexus for healthcare provider review
        </p>
      </div>

      {/* Upload Form */}
      <Card className="healthcare-card">
        <CardHeader className="bg-gradient-to-r from-secondary-50 to-primary-50 rounded-t-lg">
          <CardTitle className="text-clinical-900 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-secondary-600" />
            New Report Upload
          </CardTitle>
          <CardDescription className="text-clinical-600">
            Upload PDF or image files of your medical reports. All uploads are encrypted and HIPAA compliant.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reportName" className="text-clinical-700 font-medium">
                Report Name *
              </Label>
              <Input
                id="reportName"
                type="text"
                placeholder="e.g., Blood Test Results, X-Ray Report"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                required
                disabled={isUploading}
                className="healthcare-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-clinical-700 font-medium">
                Medical Report File *
              </Label>
              <div className="border-2 border-dashed border-clinical-300 rounded-lg p-6 text-center hover:border-secondary-400 transition-colors">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  required
                  disabled={isUploading}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  <div className="space-y-2">
                    <FileText className="h-8 w-8 text-clinical-400 mx-auto" />
                    <p className="text-clinical-600">
                      <span className="font-medium text-secondary-600">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-clinical-500">PDF, JPEG, PNG up to 10MB</p>
                  </div>
                </label>
              </div>
              {file && (
                <div className="flex items-center space-x-2 text-sm text-success-700 bg-success-50 p-2 rounded">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Selected: {file.name} ({formatFileSize(file.size)})
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments" className="text-clinical-700 font-medium">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="comments"
                placeholder="Any additional information about this report that might be helpful for your healthcare provider..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={isUploading}
                rows={3}
                className="healthcare-input"
              />
            </div>

            {error && (
              <Alert className="border-error-200 bg-error-50">
                <AlertDescription className="text-error-700">{error}</AlertDescription>
              </Alert>
            )}

            {uploadSuccess && (
              <Alert className="border-success-200 bg-success-50">
                <CheckCircle className="h-4 w-4 text-success-600" />
                <AlertDescription className="text-success-700">
                  <strong>Upload successful!</strong> Your medical report has been securely uploaded to AWS S3 and saved
                  to the database. Your healthcare provider can now access and download the report.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isUploading || !file}
              className="w-full healthcare-button-secondary h-12 text-base font-medium"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading Securely...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-5 w-5" />
                  Upload Report Securely
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Reports - Real-time data */}
      <Card className="healthcare-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-clinical-900 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                My Medical Reports ({myReports.length})
              </CardTitle>
              <CardDescription className="text-clinical-600">
                Your uploaded medical reports and their current status
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMyReports}
              disabled={loadingReports}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingReports ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loadingReports ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-primary-600 mx-auto mb-4 animate-spin" />
              <p className="text-clinical-600">Loading your reports...</p>
            </div>
          ) : reportsError ? (
            <Alert className="border-error-200 bg-error-50">
              <AlertDescription className="text-error-700">{reportsError}</AlertDescription>
            </Alert>
          ) : myReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-clinical-300 mx-auto mb-4" />
              <p className="text-clinical-500 text-lg">No reports uploaded yet</p>
              <p className="text-clinical-400 text-sm">Upload your first medical report using the form above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-clinical-50">
                    <TableHead className="font-semibold text-clinical-700">Report Name</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Upload Date</TableHead>
                    <TableHead className="font-semibold text-clinical-700">File Size</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Status</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myReports.map((report) => (
                    <TableRow key={report.ReportId} className="hover:bg-clinical-50">
                      <TableCell className="font-medium text-clinical-900">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-primary-600" />
                          <div>
                            <span>{report.Name}</span>
                            {report.Comments && <p className="text-xs text-clinical-500 mt-1">{report.Comments}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-clinical-400" />
                          <span className="text-clinical-600">
                            {new Date(report.CreatedAt || report.UpdatedDate).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-clinical-600">
                          {report.FileSize ? formatFileSize(report.FileSize) : "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(report)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(report.ReportId, report.Name)}
                          disabled={downloadingId === report.ReportId}
                          className="healthcare-button-accent"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {downloadingId === report.ReportId ? "Downloading..." : "Download"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
