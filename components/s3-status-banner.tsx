"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Cloud, CloudOff, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { config } from "@/lib/config"

export default function S3StatusBanner() {
  const { user } = useAuth()
  const [s3Status, setS3Status] = useState<{
    success: boolean
    message: string
    loading: boolean
  }>({
    success: false,
    message: "Checking file storage...",
    loading: true,
  })

  // Don't show in production unless explicitly enabled or user is admin in dev mode
  if (!config.features.showS3Status && !(user?.Role === "Admin" && config.isDevelopment)) {
    return null
  }

  const testS3Connection = async () => {
    if (!user) {
      setS3Status({
        success: false,
        message: "Authentication required",
        loading: false,
      })
      return
    }

    if (user.Role !== "Admin" && !config.isDevelopment) {
      setS3Status({
        success: true,
        message: "File storage is available",
        loading: false,
      })
      return
    }

    setS3Status((prev) => ({ ...prev, loading: true }))

    try {
      const token = localStorage.getItem("auth-token")
      if (!token) {
        setS3Status({
          success: false,
          message: "Authentication token not found",
          loading: false,
        })
        return
      }

      console.log("[S3 STATUS] Testing file storage connection...")
      const response = await fetch("/api/s3/test", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setS3Status({
          success: result.success,
          message: config.features.showTechnicalDetails
            ? result.message
            : result.success
              ? "File storage connected successfully"
              : "File storage connection failed",
          loading: false,
        })
      } else {
        const errorData = await response.json().catch(() => ({ message: "Failed to test file storage" }))
        setS3Status({
          success: false,
          message: config.features.showTechnicalDetails ? errorData.message : "File storage connection failed",
          loading: false,
        })
      }
    } catch (error) {
      console.error("[S3 STATUS] Connection test failed:", error)
      setS3Status({
        success: false,
        message: config.features.showTechnicalDetails
          ? "Failed to connect to file storage - check credentials and network"
          : "File storage connection failed",
        loading: false,
      })
    }
  }

  useEffect(() => {
    if (user) {
      testS3Connection()
    } else {
      setS3Status({
        success: false,
        message: "User authentication required",
        loading: false,
      })
    }
  }, [user])

  if (!user) {
    return null
  }

  // Show simplified status for non-admin users in production
  if (user.Role !== "Admin" && config.isProduction) {
    return (
      <Alert className="mb-6 border-primary-200 bg-primary-50">
        <Cloud className="h-4 w-4 text-primary-600 mr-2" />
        <AlertDescription className="text-primary-800">
          <strong className="font-semibold">File Storage:</strong> Ready for uploads and downloads
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className={`mb-6 ${s3Status.success ? "border-success-200 bg-success-50" : "border-error-200 bg-error-50"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {s3Status.loading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-clinical-600 mr-2" />
          ) : s3Status.success ? (
            <Cloud className="h-4 w-4 text-success-600 mr-2" />
          ) : (
            <CloudOff className="h-4 w-4 text-error-600 mr-2" />
          )}
          <AlertDescription className={s3Status.success ? "text-success-800" : "text-error-800"}>
            <strong className="font-semibold">File Storage Status:</strong> {s3Status.message}
            {s3Status.success && config.features.showTechnicalDetails && (
              <>
                <br />
                <span className="text-sm">Bucket: diagnexus-medical-reports | Region: us-east-1</span>
              </>
            )}
          </AlertDescription>
        </div>
        {config.features.showTechnicalDetails && (
          <Button variant="outline" size="sm" onClick={testS3Connection} disabled={s3Status.loading} className="ml-4">
            {s3Status.loading ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Test Connection
          </Button>
        )}
      </div>
    </Alert>
  )
}
