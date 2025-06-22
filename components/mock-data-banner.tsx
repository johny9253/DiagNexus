"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { config } from "@/lib/config"

export default function MockDataBanner() {
  // Don't show in production unless explicitly enabled
  if (!config.features.showMockDataBanner) {
    return null
  }

  return (
    <Alert className="mb-6 border-info-200 bg-info-50">
      <Info className="h-4 w-4 text-info-600" />
      <AlertDescription className="text-info-800">
        <strong className="font-semibold">Development Mode:</strong> This application is running in development mode
        with full diagnostic information. In production, technical details are hidden for security.
      </AlertDescription>
    </Alert>
  )
}
