"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiService } from "@/lib/api"
import type { Report } from "@/types"
import { Download, Search, FileText, Calendar, User, Stethoscope } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function DoctorView() {
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

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
    try {
      const response = await apiService.getReports()
      if (response.success && response.data) {
        // In a real app, this would include patient names from a join
        const reportsWithPatientNames = response.data.map((report) => ({
          ...report,
          PatientName: `Patient ${report.UserId}`, // Placeholder - would be actual patient name
        }))
        setReports(reportsWithPatientNames)
        setFilteredReports(reportsWithPatientNames)
      } else {
        setError("Failed to fetch reports")
      }
    } catch (error) {
      setError("Failed to fetch reports")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (reportId: number, reportName: string) => {
    setDownloadingId(reportId)
    try {
      const blob = await apiService.downloadReport(reportId)
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${reportName}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError("Failed to download report")
      }
    } catch (error) {
      setError("Failed to download report")
    } finally {
      setDownloadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-primary-400 mx-auto mb-4 animate-pulse" />
          <p className="text-clinical-600">Loading patient reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-clinical-200 pb-4">
        <h2 className="text-2xl font-bold text-clinical-900">DiagNexus Patient Reports</h2>
        <p className="text-clinical-600 mt-1">Review and download patient medical reports through DiagNexus</p>
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
          <AlertDescription className="text-error-700">{error}</AlertDescription>
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
            <Badge className="bg-primary-100 text-primary-800 border-primary-200">
              {filteredReports.length} Reports
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-clinical-300 mx-auto mb-4" />
              <p className="text-clinical-500 text-lg">No reports found</p>
              <p className="text-clinical-400 text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-clinical-50">
                    <TableHead className="font-semibold text-clinical-700">Report Name</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Patient</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Upload Date</TableHead>
                    <TableHead className="font-semibold text-clinical-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.ReportId} className="hover:bg-clinical-50">
                      <TableCell className="font-medium text-clinical-900">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-primary-600" />
                          <span>{report.Name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-secondary-600" />
                          <span className="text-clinical-700">{report.PatientName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-clinical-400" />
                          <span className="text-clinical-600">{new Date(report.UpdatedDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
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
