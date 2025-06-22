import type { User, Report, ApiResponse } from "@/types"

class ApiService {
  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth-token")
    }
    return null
  }

  private setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth-token", token)
    }
  }

  private removeAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth-token")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      console.log(`[API] Making request to: ${endpoint}`)

      const token = this.getAuthToken()
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers,
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      console.log(`[API] Request headers:`, { ...headers, Authorization: token ? "Bearer [REDACTED]" : "None" })

      const response = await fetch(endpoint, {
        headers,
        ...options,
      })

      console.log(`[API] Response status: ${response.status} ${response.statusText}`)
      console.log(`[API] Response content-type:`, response.headers.get("content-type"))

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      const isJson = contentType && contentType.includes("application/json")

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`

        if (isJson) {
          try {
            const errorData = await response.json()
            console.log(`[API] JSON error response:`, errorData)
            errorMessage = errorData.message || errorMessage
          } catch (parseError) {
            console.error(`[API] Failed to parse JSON error response:`, parseError)
          }
        } else {
          // Handle non-JSON error responses (like HTML error pages)
          try {
            const textResponse = await response.text()
            console.log(`[API] Non-JSON error response (first 200 chars):`, textResponse.substring(0, 200))

            // Try to extract meaningful error from HTML
            if (textResponse.includes("Internal Server Error")) {
              errorMessage = "Internal server error - please try again"
            } else if (textResponse.includes("404")) {
              errorMessage = "API endpoint not found"
            } else if (textResponse.includes("500")) {
              errorMessage = "Server error - please try again later"
            }
          } catch (textError) {
            console.error(`[API] Failed to read error response as text:`, textError)
          }
        }

        throw new Error(errorMessage)
      }

      // Handle successful responses
      if (isJson) {
        try {
          const data = await response.json()
          console.log(`[API] Success JSON response:`, { success: data.success, hasData: !!data.data })

          // Handle auth token from login
          if (endpoint === "/api/auth/login" && response.headers.get("X-Auth-Token")) {
            const authToken = response.headers.get("X-Auth-Token")!
            this.setAuthToken(authToken)
            console.log(`[API] Auth token stored`)
          }

          return data
        } catch (parseError) {
          console.error(`[API] Failed to parse success JSON response:`, parseError)
          throw new Error("Invalid JSON response format")
        }
      } else {
        // Non-JSON successful response
        console.warn(`[API] Non-JSON successful response received`)
        return {
          success: true,
          message: "Request completed successfully",
        } as ApiResponse<T>
      }
    } catch (error) {
      console.error(`[API] Request failed for ${endpoint}:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown network error",
      }
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<User>> {
    console.log(`[API] Attempting login for:`, email)

    if (!email || !password) {
      return {
        success: false,
        message: "Email and password are required",
      }
    }

    try {
      const result = await this.request<User>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      })

      console.log(`[API] Login result:`, { success: result.success, message: result.message })
      return result
    } catch (error) {
      console.error(`[API] Login request failed:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Login request failed",
      }
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    console.log(`[API] Logging out`)
    this.removeAuthToken()
    return { success: true, message: "Logged out successfully" }
  }

  // Users
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>("/api/users")
  }

  async createUser(user: Omit<User, "UserId">): Promise<ApiResponse<User>> {
    return this.request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(user),
    })
  }

  async updateUser(userId: number, user: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(user),
    })
  }

  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/users/${userId}`, {
      method: "DELETE",
    })
  }

  // Reports
  async getReports(userId?: number): Promise<ApiResponse<Report[]>> {
    const endpoint = userId ? `/api/reports?userId=${userId}` : "/api/reports"
    return this.request<Report[]>(endpoint)
  }

  async uploadReport(formData: FormData): Promise<ApiResponse<Report>> {
    try {
      console.log(`[API] Uploading report...`)

      const token = this.getAuthToken()
      const headers: Record<string, string> = {}

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch("/api/reports/upload", {
        method: "POST",
        headers,
        body: formData,
      })

      console.log(`[API] Upload response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `Upload failed with status ${response.status}` }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log(`[API] Upload successful`)
      return result
    } catch (error) {
      console.error(`[API] Upload failed:`, error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  async downloadReport(reportId: number): Promise<Blob | null> {
    try {
      console.log(`[API] Downloading report ${reportId}...`)

      const token = this.getAuthToken()
      const headers: Record<string, string> = {}

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/reports/${reportId}/download`, {
        headers,
      })

      console.log(`[API] Download response status: ${response.status}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      console.log(`[API] Download successful`)
      return blob
    } catch (error) {
      console.error(`[API] Download failed:`, error)
      return null
    }
  }
}

export const apiService = new ApiService()
