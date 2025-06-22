"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { config } from "@/lib/config"

export default function DatabaseStatusBanner() {
  const { user } = useAuth()
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean
    error: string | null
    loading: boolean
    initializing?: boolean
    host?: string
    database?: string
    pool?: {
      totalCount: number
      idleCount: number
      waitingCount: number
    }
  }>({
    connected: false,
    error: null,
    loading: true,
  })

  const checkDatabaseStatus = async () => {
    setDbStatus((prev) => ({ ...prev, loading: true }))

    try {
      const response = await fetch("/api/health/database")
      const result = await response.json()
      setDbStatus({
        connected: result.connected,
        error: result.error,
        loading: false,
        initializing: result.initializing,
        host: result.host,
        database: result.database,
        pool: result.pool,
      })
    } catch (error) {
      setDbStatus({
        connected: false,
        error: "Failed to check database status",
        loading: false,
        initializing: false,
      })
    }
  }

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = []
    const regularInterval: NodeJS.Timeout | null = null

    if (user) {
      checkDatabaseStatus()

      // Only set up intervals in development
      if (config.isDevelopment) {
        intervals.push(setTimeout(() => checkDatabaseStatus(), 2000))
        intervals.push(setTimeout(() => checkDatabaseStatus(), 5000))
        intervals.push(setTimeout(() => checkDatabaseStatus(), 10000))
        const newRegularInterval = setInterval(checkDatabaseStatus, 30000)
        return () => {
          intervals.forEach(clearTimeout)
          clearInterval(newRegularInterval)
        }
      }
    }

    return () => {
      intervals.forEach(clearTimeout)
      if (regularInterval) {
        clearInterval(regularInterval)
      }
    }
  }, [user])

  // Don't show in production unless explicitly enabled or user is admin in dev mode
  if (!config.features.showDatabaseStatus && !(user?.Role === "Admin" && config.isDevelopment)) {
    return null
  }

  if (!user) {
    return null
  }

  if (dbStatus.loading || dbStatus.initializing) {
    return (
      <Alert className="mb-6 border-warning-200 bg-warning-50">
        <div className="flex items-center">
          <RefreshCw className="h-4 w-4 animate-spin text-warning-600 mr-2" />
          <AlertDescription className="text-warning-800">
            <strong className="font-semibold">Database Status:</strong>
            {dbStatus.initializing ? " Initializing connection..." : " Checking database connection..."}
            {config.features.showTechnicalDetails && (
              <>
                <br />
                <span className="text-sm text-warning-700">
                  First-time connections may take 10-15 seconds to establish. Please wait...
                </span>
              </>
            )}
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  if (dbStatus.connected) {
    return (
      <Alert className="mb-6 border-success-200 bg-success-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-success-600 mr-2" />
            <AlertDescription className="text-success-800">
              <strong className="font-semibold">Database Status:</strong> Connected successfully
              {config.features.showTechnicalDetails && (
                <>
                  <br />
                  <span className="text-sm text-success-700">
                    Host: {dbStatus.host} | Database: {dbStatus.database}
                    {dbStatus.pool && user.Role === "Admin" && (
                      <>
                        {" "}
                        | Pool: {dbStatus.pool.totalCount} total, {dbStatus.pool.idleCount} idle,{" "}
                        {dbStatus.pool.waitingCount} waiting
                      </>
                    )}
                  </span>
                </>
              )}
            </AlertDescription>
          </div>
          {config.features.showTechnicalDetails && user.Role === "Admin" && (
            <Button variant="outline" size="sm" onClick={checkDatabaseStatus} className="ml-4">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          )}
        </div>
      </Alert>
    )
  }

  return (
    <Alert className="mb-6 border-error-200 bg-error-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 text-error-600 mr-2" />
          <AlertDescription className="text-error-800">
            <strong className="font-semibold">Database Error:</strong> {dbStatus.error || "Connection failed"}
            {config.features.showTechnicalDetails && (
              <>
                <br />
                <span className="text-sm">
                  Connection is warming up. This is normal for the first request. Please wait or refresh.
                </span>
                <br />
                <span className="text-xs text-error-700">Target: {dbStatus.host || "Database server"}</span>
              </>
            )}
          </AlertDescription>
        </div>
        {config.features.showTechnicalDetails && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={checkDatabaseStatus} className="ml-4">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        )}
      </div>
    </Alert>
  )
}
