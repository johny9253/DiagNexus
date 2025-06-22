export interface User {
  UserId: number
  Role: "Admin" | "Doctor" | "Patient"
  Name: string
  Mail: string
  Password: string
  UpdatedBy: number | null
  UpdatedDate: string
  IsActive: boolean
}

export interface Report {
  ReportId: number
  UserId: number
  Name: string
  Path: string
  Comments?: string
  UpdatedBy: number
  UpdatedDate: string
  IsActive: boolean
  PatientName?: string
  FileSize?: number
  FileType?: string
  UpdatedByName?: string
  CreatedAt?: string
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}
