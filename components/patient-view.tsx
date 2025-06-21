"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { apiService } from "@/lib/api"
import { Upload, Loader2, CheckCircle, FileText, Calendar, Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function PatientView() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [reportName, setReportName] = useState("")
  const [comments, setComments] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState("")

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

      const response = await apiService.uploadReport(formData)

      if (response.success) {
        setUploadSuccess(true)
        setFile(null)
        setReportName("")
        setComments("")
        // Reset file input
        const fileInput = document.getElementById("file") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        setError(response.message || "Upload failed")
      }
    } catch (error) {
      setError("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
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
                  <span>Selected: {file.name}</span>
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
                  <strong>Upload successful!</strong> Your medical report has been securely uploaded to DiagNexus and is
                  now available for your healthcare provider to review.
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

      {/* My Reports */}
      <Card className="healthcare-card">
        <CardHeader>
          <CardTitle className="text-clinical-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary-600" />
            My Medical Reports
          </CardTitle>
          <CardDescription className="text-clinical-600">
            Your uploaded medical reports and their status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-clinical-200 rounded-lg bg-clinical-50">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 p-2 rounded">
                  <FileText className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-clinical-900">Blood Test Report</p>
                  <div className="flex items-center text-sm text-clinical-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    Uploaded on Jun 20, 2025
                  </div>
                </div>
              </div>
              <Badge className="bg-success-100 text-success-800 border-success-200">Reviewed</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border border-clinical-200 rounded-lg bg-clinical-50">
              <div className="flex items-center space-x-3">
                <div className="bg-secondary-100 p-2 rounded">
                  <FileText className="h-4 w-4 text-secondary-600" />
                </div>
                <div>
                  <p className="font-medium text-clinical-900">X-ray Report</p>
                  <div className="flex items-center text-sm text-clinical-600">
                    <Calendar className="h-3 w-3 mr-1" />
                    Uploaded on Jun 21, 2025
                  </div>
                </div>
              </div>
              <Badge className="bg-warning-100 text-warning-800 border-warning-200">Pending Review</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
