"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import PatientView from "@/components/patient-view"
import DoctorView from "@/components/doctor-view"
import AdminView from "@/components/admin-view"

export default function Dashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    // Update page title based on user role
    if (user) {
      document.title = `DiagNexus - ${user.Role} Dashboard`
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-clinical-600">Loading DiagNexus...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const renderRoleBasedView = () => {
    switch (user.Role) {
      case "Patient":
        return <PatientView />
      case "Doctor":
        return <DoctorView />
      case "Admin":
        return <AdminView />
      default:
        return <div>Invalid user role</div>
    }
  }

  return <DashboardLayout>{renderRoleBasedView()}</DashboardLayout>
}
