"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Zap } from "lucide-react"

export default function MockDataBanner() {
  return (
    <Alert className="mb-6 border-secondary-200 bg-secondary-50">
      <Zap className="h-4 w-4 text-secondary-600" />
      <AlertDescription className="text-secondary-800">
        <strong className="font-semibold">DiagNexus Demo Mode:</strong> This application is running with simulated
        medical data for demonstration purposes. In production, DiagNexus would securely connect to your healthcare
        backend infrastructure with full HIPAA compliance.
      </AlertDescription>
    </Alert>
  )
}
