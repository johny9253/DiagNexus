import type { User, Report, ApiResponse } from "@/types"

const API_BASE_URL = "http://localhost:3000"

// Mock data based on the provided models
const MOCK_USERS: User[] = [
  {
    UserId: 1,
    Role: "Admin",
    Name: "Alice Johnson",
    Mail: "alice@example.com",
    Password: "admin123",
    UpdatedBy: null,
    UpdatedDate: "2025-06-20T12:00:00Z",
    IsActive: true,
  },
  {
    UserId: 2,
    Role: "Doctor",
    Name: "Dr. Smith",
    Mail: "smith@hospital.com",
    Password: "docpass",
    UpdatedBy: 1,
    UpdatedDate: "2025-06-20T12:30:00Z",
    IsActive: true,
  },
  {
    UserId: 3,
    Role: "Patient",
    Name: "John Doe",
    Mail: "john.doe@example.com",
    Password: "patientpass",
    UpdatedBy: 2,
    UpdatedDate: "2025-06-20T13:00:00Z",
    IsActive: true,
  },
]

const MOCK_REPORTS: Report[] = [
  {
    ReportId: 101,
    UserId: 3,
    Name: "Blood Test Report",
    Path: "s3://bucket/reports/bloodtest_john.pdf",
    UpdatedBy: 2,
    UpdatedDate: "2025-06-20T15:00:00Z",
    IsActive: true,
    PatientName: "John Doe",
  },
  {
    ReportId: 102,
    UserId: 3,
    Name: "X-ray Report",
    Path: "s3://bucket/reports/xray_john.pdf",
    UpdatedBy: 2,
    UpdatedDate: "2025-06-21T10:00:00Z",
    IsActive: true,
    PatientName: "John Doe",
  },
]

class ApiService {
  private useMockData = true // Set to false when real API is available

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    if (this.useMockData) {
      // Return mock data instead of making real API calls
      return this.handleMockRequest<T>(endpoint, options)
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("API request failed:", error)
      // Fallback to mock data if real API fails
      return this.handleMockRequest<T>(endpoint, options)
    }
  }

  private async handleMockRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const method = options.method || "GET"

    try {
      if (endpoint === "/auth/login" && method === "POST") {
        const body = JSON.parse(options.body as string)
        const user = MOCK_USERS.find((u) => u.Mail === body.email && u.Password === body.password)
        if (user) {
          return { success: true, data: user as T }
        } else {
          return { success: false, message: "Invalid credentials" }
        }
      }

      if (endpoint === "/users" && method === "GET") {
        return { success: true, data: MOCK_USERS as T }
      }

      if (endpoint === "/reports" && method === "GET") {
        return { success: true, data: MOCK_REPORTS as T }
      }

      if (endpoint.startsWith("/reports?userId=") && method === "GET") {
        const userId = Number.parseInt(endpoint.split("userId=")[1])
        const userReports = MOCK_REPORTS.filter((r) => r.UserId === userId)
        return { success: true, data: userReports as T }
      }

      if (endpoint === "/reports/upload" && method === "POST") {
        // Simulate successful upload
        const newReport: Report = {
          ReportId: Date.now(),
          UserId: 3, // Default to patient user
          Name: "New Report",
          Path: `s3://bucket/reports/report_${Date.now()}.pdf`,
          UpdatedBy: 3,
          UpdatedDate: new Date().toISOString(),
          IsActive: true,
          PatientName: "John Doe",
        }
        MOCK_REPORTS.push(newReport)
        return { success: true, data: newReport as T }
      }

      return { success: false, message: "Endpoint not found" }
    } catch (error) {
      return { success: false, message: "Mock API error" }
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<User>> {
    return this.request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  // Users
  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>("/users")
  }

  async createUser(user: Omit<User, "UserId">): Promise<ApiResponse<User>> {
    return this.request<User>("/users", {
      method: "POST",
      body: JSON.stringify(user),
    })
  }

  async updateUser(userId: number, user: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(user),
    })
  }

  async deleteUser(userId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${userId}`, {
      method: "DELETE",
    })
  }

  // Reports
  async getReports(userId?: number): Promise<ApiResponse<Report[]>> {
    const endpoint = userId ? `/reports?userId=${userId}` : "/reports"
    return this.request<Report[]>(endpoint)
  }

  async uploadReport(formData: FormData): Promise<ApiResponse<Report>> {
    // Extract form data for mock processing
    const name = formData.get("name") as string
    const userId = Number.parseInt(formData.get("userId") as string)
    const comments = formData.get("comments") as string

    if (this.useMockData) {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate upload time

      const newReport: Report = {
        ReportId: Date.now(),
        UserId: userId,
        Name: name,
        Path: `s3://bucket/reports/${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.pdf`,
        Comments: comments,
        UpdatedBy: userId,
        UpdatedDate: new Date().toISOString(),
        IsActive: true,
        PatientName: MOCK_USERS.find((u) => u.UserId === userId)?.Name || "Unknown Patient",
      }

      MOCK_REPORTS.push(newReport)
      return { success: true, data: newReport }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reports/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Upload failed",
      }
    }
  }

  async downloadReport(reportId: number): Promise<Blob | null> {
    if (this.useMockData) {
      // Create a mock PDF blob for download
      const pdfContent = `Mock PDF content for report ${reportId}`
      return new Blob([pdfContent], { type: "application/pdf" })
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}/download`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.blob()
    } catch (error) {
      console.error("Download failed:", error)
      // Return mock blob as fallback
      const pdfContent = `Mock PDF content for report ${reportId}`
      return new Blob([pdfContent], { type: "application/pdf" })
    }
  }

  // Method to toggle between mock and real API
  setUseMockData(useMock: boolean) {
    this.useMockData = useMock
  }
}

export const apiService = new ApiService()
