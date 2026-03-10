export interface User {
  id: string
  email: string
  name: string
  avatar: string
  createdAt: Date
  updatedAt: Date
}

export interface UserSettings {
  id: string
  userId: string
  autoUpdate: boolean
  lastSeenVersion?: string | null
  lastCheckedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface RegisterResponse {
  user: User
  token: string
}

export interface UpdateProfileRequest {
  token: string
  updated: {
    name?: string
    avatar?: string
  }
}