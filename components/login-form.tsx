"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Loader2, Heart, Shield, Zap } from "lucide-react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const success = await login(email, password)
      if (success) {
        router.push("/dashboard")
      } else {
        setError("Invalid email or password")
      }
    } catch (error) {
      setError("Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-clinical-50 to-primary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Header with DiagNexus Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-gradient-to-r from-primary-600 to-secondary-500 p-3 rounded-full shadow-lg">
              <div className="relative">
                <Heart className="h-8 w-8 text-white" />
                <Zap className="h-4 w-4 text-white absolute -top-1 -right-1" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            DiagNexus
          </h1>
          <p className="text-clinical-600 mt-2 font-medium">Advanced Medical Report Management</p>
          <p className="text-clinical-500 text-sm">Connecting Healthcare Through Technology</p>
        </div>

        <Card className="healthcare-card shadow-lg">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-clinical-900">Sign In</CardTitle>
            <CardDescription className="text-center text-clinical-600">
              Access your secure DiagNexus portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-clinical-700 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="healthcare-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-clinical-700 font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="healthcare-input"
                />
              </div>
              {error && (
                <Alert className="border-error-200 bg-error-50">
                  <AlertDescription className="text-error-700">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full healthcare-button-primary h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Sign In Securely
                  </>
                )}
              </Button>
            </form>

            {/* Demo Accounts Section */}
            <div className="mt-6 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
              <p className="text-sm font-semibold text-secondary-800 mb-3 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Demo Mode - Try These Accounts:
              </p>
              <div className="text-xs text-secondary-700 space-y-2">
                <div className="flex justify-between items-center p-2 bg-white rounded border border-secondary-100">
                  <span className="font-medium">Admin:</span>
                  <span className="text-clinical-600">alice@example.com / admin123</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border border-secondary-100">
                  <span className="font-medium">Doctor:</span>
                  <span className="text-clinical-600">smith@hospital.com / docpass</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded border border-secondary-100">
                  <span className="font-medium">Patient:</span>
                  <span className="text-clinical-600">john.doe@example.com / patientpass</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-clinical-500">DiagNexus - Your data is protected with enterprise-grade security</p>
        </div>
      </div>
    </div>
  )
}
