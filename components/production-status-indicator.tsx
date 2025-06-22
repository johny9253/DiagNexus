"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle } from "lucide-react"
import { config } from "@/lib/config"

export default function ProductionStatusIndicator() {
  // Only show in production
  if (!config.isProduction) {
    return null
  }

  return (
    <Alert className="mb-6 border-success-200 bg-success-50">
      <Shield className="h-4 w-4 text-success-600" />
      <AlertDescription className="text-success-800">
        <div className="flex items-center justify-between">
          <div>
            <strong className="font-semibold">DiagNexus Production:</strong> Secure healthcare platform ready
            <br />
            <span className="text-sm text-success-700">
              HIPAA-compliant • End-to-end encryption • Enterprise security
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-success-600" />
            <span className="text-sm font-medium">Operational</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
