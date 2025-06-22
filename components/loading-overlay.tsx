"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Database, Cloud, CheckCircle, AlertTriangle } from "lucide-react"

interface LoadingOverlayProps {
  show: boolean
  onComplete?: () => void
}

export default function LoadingOverlay({ show, onComplete }: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("Initializing...")
  const [dbStatus, setDbStatus] = useState<"loading" | "success" | "error">("loading")
  const [s3Status, setS3Status] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    if (!show) return

    const steps = [
      { progress: 20, step: "Connecting to AWS RDS PostgreSQL...", delay: 1000 },
      { progress: 40, step: "Warming up database connection pool...", delay: 2000 },
      { progress: 60, step: "Initializing AWS S3 client...", delay: 1500 },
      { progress: 80, step: "Verifying services...", delay: 1000 },
      { progress: 100, step: "Ready!", delay: 500 },
    ]

    let currentIndex = 0

    const runStep = () => {
      if (currentIndex < steps.length) {
        const { progress, step, delay } = steps[currentIndex]
        setProgress(progress)
        setCurrentStep(step)

        // Update status based on step
        if (progress >= 40) setDbStatus("success")
        if (progress >= 80) setS3Status("success")

        setTimeout(() => {
          currentIndex++
          if (currentIndex < steps.length) {
            runStep()
          } else {
            setTimeout(() => {
              onComplete?.()
            }, 500)
          }
        }, delay)
      }
    }

    runStep()
  }, [show, onComplete])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96 healthcare-card">
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-2">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-500 p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Database className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-clinical-900">DiagNexus</h3>
            <p className="text-clinical-600">Initializing Healthcare Platform</p>
          </div>

          <div className="space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-clinical-700 font-medium">{currentStep}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-clinical-400" />
                <span>AWS RDS PostgreSQL</span>
              </div>
              {dbStatus === "loading" && (
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              )}
              {dbStatus === "success" && <CheckCircle className="h-4 w-4 text-success-600" />}
              {dbStatus === "error" && <AlertTriangle className="h-4 w-4 text-error-600" />}
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Cloud className="h-4 w-4 text-clinical-400" />
                <span>AWS S3 Storage</span>
              </div>
              {s3Status === "loading" && (
                <div className="w-4 h-4 border-2 border-secondary-600 border-t-transparent rounded-full animate-spin" />
              )}
              {s3Status === "success" && <CheckCircle className="h-4 w-4 text-success-600" />}
              {s3Status === "error" && <AlertTriangle className="h-4 w-4 text-error-600" />}
            </div>
          </div>

          <p className="text-xs text-clinical-500">First-time connections may take 10-15 seconds</p>
        </CardContent>
      </Card>
    </div>
  )
}
