"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { LogOut, Heart, Users, Upload, FileText, Activity, Zap } from "lucide-react"
import MockDataBanner from "@/components/mock-data-banner"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  if (!user) {
    return null
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

  return (
    <div className="min-h-screen bg-clinical-50">
      {/* Header */}
      <header className="healthcare-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-primary-600 to-secondary-500 p-2 rounded-lg shadow-md">
                <div className="relative">
                  <Heart className="h-6 w-6 text-white" />
                  <Zap className="h-3 w-3 text-white absolute -top-0.5 -right-0.5" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  DiagNexus
                </h1>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-clinical-600">Welcome,</span>
                  <span className="text-sm font-medium text-clinical-900">{user.Name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getRoleColor(user.Role)}`}>
                    {user.Role}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-clinical-600">
                <Activity className="h-4 w-4 text-success-500" />
                <span>System Online</span>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-clinical-300 text-clinical-700 hover:bg-clinical-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MockDataBanner />
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64">
            <nav className="healthcare-sidebar rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold text-clinical-700 mb-3 uppercase tracking-wide">Navigation</h3>
              {user.Role === "Patient" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-clinical-700 hover:bg-secondary-50 hover:text-secondary-700"
                >
                  <Upload className="h-4 w-4 mr-3" />
                  Upload Reports
                </Button>
              )}
              {user.Role === "Doctor" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-clinical-700 hover:bg-primary-50 hover:text-primary-700"
                >
                  <FileText className="h-4 w-4 mr-3" />
                  Patient Reports
                </Button>
              )}
              {user.Role === "Admin" && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-clinical-700 hover:bg-error-50 hover:text-error-700"
                  >
                    <Users className="h-4 w-4 mr-3" />
                    Manage Users
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-clinical-700 hover:bg-error-50 hover:text-error-700"
                  >
                    <FileText className="h-4 w-4 mr-3" />
                    All Reports
                  </Button>
                </>
              )}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="healthcare-card p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
