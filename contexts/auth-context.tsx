"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User, AuthContextType } from "@/types"
import { apiService } from "@/lib/api"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    try {
      const storedUser = localStorage.getItem("user")
      const storedToken = localStorage.getItem("auth-token")

      console.log("[AUTH CONTEXT] Checking stored session:", {
        hasUser: !!storedUser,
        hasToken: !!storedToken,
      })

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser)
        console.log("[AUTH CONTEXT] Restored user session:", parsedUser.Name)
        setUser(parsedUser)
      }
    } catch (error) {
      console.error("[AUTH CONTEXT] Failed to restore session:", error)
      // Clear corrupted data
      localStorage.removeItem("user")
      localStorage.removeItem("auth-token")
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log("[AUTH CONTEXT] Login attempt for:", email)
    setLoading(true)

    try {
      const response = await apiService.login(email, password)
      console.log("[AUTH CONTEXT] Login response:", {
        success: response.success,
        message: response.message,
      })

      if (response.success && response.data) {
        console.log("[AUTH CONTEXT] Login successful, storing user data")
        setUser(response.data)
        localStorage.setItem("user", JSON.stringify(response.data))
        return true
      } else {
        console.log("[AUTH CONTEXT] Login failed:", response.message)
        return false
      }
    } catch (error) {
      console.error("[AUTH CONTEXT] Login error:", error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    console.log("[AUTH CONTEXT] Logging out")
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("auth-token")
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
