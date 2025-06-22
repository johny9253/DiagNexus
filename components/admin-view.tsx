"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiService } from "@/lib/api"
import type { User, Report } from "@/types"
import {
  Users,
  FileText,
  Calendar,
  Mail,
  UserCheck,
  Shield,
  Activity,
  Database,
  RefreshCw,
  Loader2,
} from "lucide-react"
import S3StatusBanner from "@/components/s3-status-banner"

export default function AdminView() {
  const [users, setUsers] = useState<User[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingReports, setLoadingReports] = useState(true)
  const [usersError, setUsersError] = useState("")
  const [reportsError, setReportsError] = useState("")

  useEffect(() => {
    fetchUsers()
    fetchReports()
  }, [])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    setUsersError("")

    try {
      console.log("[ADMIN VIEW] Fetching users from database...")
      const response = await apiService.getUsers()

      if (response.success && response.data) {
        console.log("[ADMIN VIEW] Received", response.data.length, "users")
        setUsers(response.data)
      } else {
        setUsersError(response.message || "Failed to fetch users")
      }
    } catch (error) {
      console.error("[ADMIN VIEW] Error fetching users:", error)
      setUsersError("Failed to fetch users from database")
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchReports = async () => {
    setLoadingReports(true)
    setReportsError("")

    try {
      console.log("[ADMIN VIEW] Fetching reports from database...")
      const response = await apiService.getReports()

      if (response.success && response.data) {
        console.log("[ADMIN VIEW] Received", response.data.length, "reports")
        setReports(response.data)
      } else {
        setReportsError(response.message || "Failed to fetch reports")
      }
    } catch (error) {
      console.error("[ADMIN VIEW] Error fetching reports:", error)
      setReportsError("Failed to fetch reports from database")
    } finally {
      setLoadingReports(false)
    }
  }

  const refreshData = async () => {
    await Promise.all([fetchUsers(), fetchReports()])
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-error-100 text-error-800 border-error-200"
      case "Doctor":
        return "bg-primary-100 text-primary-800 border-primary-200"
      case "Patient":
        return "bg-secondary-100 text-secondary-800 border-secondary-200"
      default:
        return "bg-clinical-100 text-clinical-800 border-clinical-200"
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-clinical-900">DiagNexus Admin Dashboard</h2>
            <p className="text-clinical-600 mt-1">Real-time system administration and user management</p>
          </div>
          <Button
            onClick={refreshData}
            disabled={loadingUsers || loadingReports}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loadingUsers || loadingReports ? "animate-spin" : ""}`} />
            <span>Refresh All Data</span>
          </Button>
        </div>
      </div>

      <S3StatusBanner />

      {/* Statistics Cards - Real-time data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="healthcare-card border-l-4 border-l-primary-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-clinical-600">Total Users</p>
                <p className="text-3xl font-bold text-clinical-900">
                  {loadingUsers ? <Loader2 className="h-8 w-8 animate-spin" /> : users.length}
                </p>
                <p className="text-xs text-clinical-500 mt-1">Registered in system</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="healthcare-card border-l-4 border-l-secondary-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-clinical-600">Total Reports</p>
                <p className="text-3xl font-bold text-clinical-900">
                  {loadingReports ? <Loader2 className="h-8 w-8 animate-spin" /> : reports.length}
                </p>
                <p className="text-xs text-clinical-500 mt-1">Medical reports uploaded</p>
              </div>
              <div className="bg-secondary-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-secondary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="healthcare-card border-l-4 border-l-success-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-clinical-600">Active Users</p>
                <p className="text-3xl font-bold text-clinical-900">
                  {loadingUsers ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    users.filter((user) => user.IsActive).length
                  )}
                </p>
                <p className="text-xs text-clinical-500 mt-1">Currently active</p>
              </div>
              <div className="bg-success-100 p-3 rounded-full">
                <UserCheck className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-clinical-100">
          <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:text-clinical-900">
            <Users className="h-4 w-4 mr-2" />
            Users Management
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-white data-[state=active]:text-clinical-900">
            <Database className="h-4 w-4 mr-2" />
            All Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="healthcare-card">
            <CardHeader className="bg-gradient-to-r from-primary-50 to-error-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-clinical-900 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-error-600" />
                    System Users (Real-time)
                  </CardTitle>
                  <CardDescription className="text-clinical-600">
                    Live data from AWS RDS PostgreSQL database
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsers ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingUsers ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 text-primary-600 mx-auto mb-4 animate-spin" />
                  <p className="text-clinical-600">Loading users from database...</p>
                </div>
              ) : usersError ? (
                <div className="p-6">
                  <Alert className="border-error-200 bg-error-50">
                    <AlertDescription className="text-error-700">{usersError}</AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-clinical-50">
                        <TableHead className="font-semibold text-clinical-700">Name</TableHead>
                        <TableHead className="font-semibold text-clinical-700">Email</TableHead>
                        <TableHead className="font-semibold text-clinical-700">Role</TableHead>
                        <TableHead className="font-semibold text-clinical-700">Status</TableHead>
                        <TableHead className="font-semibold text-clinical-700">Last Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.UserId} className="hover:bg-clinical-50">
                          <TableCell className="font-medium text-clinical-900">
                            <div className="flex items-center space-x-2">
                              <UserCheck className="h-4 w-4 text-clinical-400" />
                              <span>{user.Name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-clinical-400" />
                              <span className="text-clinical-700">{user.Mail}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRoleColor(user.Role)} font-medium`}>{user.Role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.IsActive
                                  ? "bg-success-100 text-success-800 border-success-200"
                                  : "bg-clinical-100 text-clinical-600 border-clinical-200"
                              }
                            >
                              <Activity className="h-3 w-3 mr-1" />
                              {user.IsActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-clinical-400" />
                              <span className="text-clinical-600">
                                {new Date(user.UpdatedDate).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="healthcare-card">
            <CardHeader className="bg-gradient-to-r from-secondary-50 to-primary-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-clinical-900 flex items-center">
                    <Database className="h-5 w-5 mr-2 text-secondary-600" />
                    All Medical Reports (Real-time)
                  </CardTitle>
                  <CardDescription className="text-clinical-600">
                    Live data from AWS RDS with S3 file paths
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchReports} disabled={loadingReports}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingReports ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingReports ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 text-secondary-600 mx-auto mb-4 animate-spin" />
                  <p className="text-clinical-600">Loading reports from database...</p>
                </div>
              ) : reportsError ? (
                <div className="p-6">
                  <Alert className="border-error-200 bg-error-50">
                    <AlertDescription className="text-error-700">{reportsError}</AlertDescription>
                  </Alert>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-clinical-300 mx-auto mb-4" />
                  <p className="text-clinical-500 text-lg">No reports found</p>
                  <p className="text-clinical-400 text-sm">Reports will appear here when patients upload them</p>
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
                        <TableHead className="font-semibold text-clinical-700">Updated By</TableHead>
                        <TableHead className="font-semibold text-clinical-700">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.ReportId} className="hover:bg-clinical-50">
                          <TableCell className="font-medium text-clinical-900">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-secondary-600" />
                              <div>
                                <span>{report.Name}</span>
                                {report.Comments && <p className="text-xs text-clinical-500 mt-1">{report.Comments}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-clinical-100 text-clinical-700 border-clinical-200">
                              {report.PatientName || `Patient ${report.UserId}`}
                            </Badge>
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
                            <span className="text-clinical-600">
                              {report.UpdatedByName || `User ${report.UpdatedBy}`}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                report.IsActive
                                  ? "bg-success-100 text-success-800 border-success-200"
                                  : "bg-clinical-100 text-clinical-600 border-clinical-200"
                              }
                            >
                              <Activity className="h-3 w-3 mr-1" />
                              {report.IsActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
