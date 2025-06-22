"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiService } from "@/lib/api"
import type { Report } from "@/types"
import { Download, Search, FileText, Calendar, User, Stethoscope, AlertTriangle, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function DoctorView() {
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [downloadError, setDownloadError] = useState("")

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    // Filter reports based on search term
    if (searchTerm.trim() === "") {
      setFilteredReports(reports)
    } else {
      const filtered = reports.filter(
        (report) =>
          report.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.PatientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          new Date(report.UpdatedDate).toLocaleDateString().includes(searchTerm),
      )
      setFilteredReports(filtered)
    }
  }, [searchTerm, reports])

  const fetchReports = async () => {
    setLoading(true)
    setError("")

    try {
      console.log("[DOCTOR VIEW] Fetching reports from database...")
      const response = await apiService.getReports()

      if (response.success && response.data) {
        console.log("[DOCTOR VIEW] Received", response.data.length, "reports")
        setReports(response.data)
        setFilteredReports(response.data)
      } else {
        setError(response.message || "Failed to fetch reports")
      }
    } catch (error) {
      console.error("[DOCTOR VIEW] Error fetching reports:", error)
      setError("Failed to fetch reports from database")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (reportId: number, reportName: string) => {
    setDownloadingId(reportId)
    setDownloadError("")

    try {
      console.log(`[DOCTOR VIEW] Attempting to download report ${reportId}: ${reportName}`)

      const blob = await apiService.downloadReport(reportId)
      if (blob) {
        console.log(`[DOCTOR VIEW] Download successful, blob size: ${blob.size} bytes`)

        // Verify we got actual content
        if (blob.size === 0) {
          throw new Error("Downloaded file is empty")
        }

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${reportName.replace(/[^a-zA-Z0-9.-]/g, "_")}.pdf`
        document.body.appendChild(a)
        a.click()

        // Cleanup
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        console.log(`[DOCTOR VIEW] File download initiated successfully`)
      } else {
        throw new Error("No file data received")
      }
    } catch (error) {
      console.error(`[DOCTOR VIEW] Download failed:`, error)
      const errorMessage = error instanceof Error ? error.message : "Download failed"
      setDownloadError(`Failed to download ${reportName}: ${errorMessage}`)
    } finally {
      setDownloadingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-primary-400 mx-auto mb-4 animate-pulse" />
          <p className="text-clinical-600">Loading patient reports from database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-clinical-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-clinical-900">DiagNexus Patient Reports</h2>
            <p className="text-clinical-600 mt-1">Real-time patient medical reports from AWS RDS database</p>
          </div>
          <Button onClick={fetchReports} disabled={loading} className="flex items-center space-x-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Reports</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="healthcare-card">
        <CardHeader className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-t-lg">
          <CardTitle className="text-clinical-900 flex items-center">
            <Search className="h-5 w-5 mr-2 text-primary-600" />
            Search Reports
          </CardTitle>
          <CardDescription className="text-clinical-600">Search by report name, patient name, or date</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-clinical-400" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 healthcare-input"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-error-200 bg-error-50">
          <AlertTriangle className="h-4 w-4 text-error-600" />
          <AlertDescription className="text-error-700">{error}</AlertDescription>
        </Alert>
      )}

      {downloadError && (
        <Alert className="border-warning-200 bg-warning-50">
          <AlertTriangle className="h-4 w-4 text-warning-600" />
          <AlertDescription className="text-warning-700">
            <strong>Download Error:</strong> {downloadError}
            <br />
            <span className="text-sm">Please ensure the file exists in S3 and try again.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Reports Table */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="text-clinical-900 flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              Medical Reports ({filteredReports.length})
            </div>
            <Badge className="bg-primary-100 text-primary-800 border-primary-200">Real-time Data</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-clinical-300 mx-auto mb-4" />
              <p className="text-clinical-500 text-lg">No reports found</p>
              <p className="text-clinical-400 text-sm">
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : "Reports will appear here when patients upload them"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-clinical-50">
                    <TableHead className="font-semibold text-clinical-700">Report Name</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Patient</TableHead>
                    <TableHead className="font-semibold text-clinical-700">File Size</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Upload Date</TableHead>
                    <TableHead className="font-semibold text-clinical-700">S3 Path</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
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
                          <User className="h-4 w-4 text-secondary-600" />
                          <span className="text-clinical-700">{report.PatientName || `Patient ${report.UserId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-clinical-600">
                          {report.FileSize ? formatFileSize(report.FileSize) : "N/A"}
                        </span>
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
                        <code className="text-xs bg-clinical-100 px-2 py-1 rounded">
                          {report.Path ? report.Path.split("/").pop() : "N/A"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(report.ReportId, report.Name)}
                          disabled={downloadingId === report.ReportId}
                          className="healthcare-button-accent"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {downloadingId === report.ReportId ? "Downloading..." : "Download from S3"}
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
