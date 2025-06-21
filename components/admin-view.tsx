"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { apiService } from "@/lib/api"
import type { User, Report } from "@/types"
import { Users, FileText, Calendar, Mail, UserCheck, Shield, Activity, Database } from "lucide-react"

export default function AdminView() {
  const [users, setUsers] = useState<User[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersResponse, reportsResponse] = await Promise.all([apiService.getUsers(), apiService.getReports()])

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data)
      }

      if (reportsResponse.success && reportsResponse.data) {
        setReports(reportsResponse.data)
      }
    } catch (error) {
      setError("Failed to fetch data")
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Shield className="h-12 w-12 text-error-400 mx-auto mb-4 animate-pulse" />
          <p className="text-clinical-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-clinical-200 pb-4">
        <h2 className="text-2xl font-bold text-clinical-900">DiagNexus Admin Dashboard</h2>
        <p className="text-clinical-600 mt-1">System administration and user management for DiagNexus platform</p>
      </div>

      {error && (
        <Alert className="border-error-200 bg-error-50">
          <AlertDescription className="text-error-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="healthcare-card border-l-4 border-l-primary-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-clinical-600">Total Users</p>
                <p className="text-3xl font-bold text-clinical-900">{users.length}</p>
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
                <p className="text-3xl font-bold text-clinical-900">{reports.length}</p>
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
                <p className="text-3xl font-bold text-clinical-900">{users.filter((user) => user.IsActive).length}</p>
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
              <CardTitle className="text-clinical-900 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-error-600" />
                System Users
              </CardTitle>
              <CardDescription className="text-clinical-600">
                Manage all users in the DiagNexus healthcare system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                            <span className="text-clinical-600">{new Date(user.UpdatedDate).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="healthcare-card">
            <CardHeader className="bg-gradient-to-r from-secondary-50 to-primary-50 rounded-t-lg">
              <CardTitle className="text-clinical-900 flex items-center">
                <Database className="h-5 w-5 mr-2 text-secondary-600" />
                All Medical Reports
              </CardTitle>
              <CardDescription className="text-clinical-600">
                View all reports uploaded to the DiagNexus healthcare platform
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-clinical-50">
                      <TableHead className="font-semibold text-clinical-700">Report Name</TableHead>
                      <TableHead className="font-semibold text-clinical-700">Patient ID</TableHead>
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
                            <span>{report.Name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-clinical-100 text-clinical-700 border-clinical-200">
                            Patient {report.UserId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-clinical-400" />
                            <span className="text-clinical-600">
                              {new Date(report.UpdatedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-clinical-600">User {report.UpdatedBy}</span>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
