export interface AppCatalog {
  id: string
  name: string
  displayName: string | null
  icon: string | null
  color: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AppSession {
  id: string
  userAppId: string
  userId: string
  startTime: Date
  endTime: Date | null
  duration: number | null
  createdAt: Date
}

export interface UserApp {
  id: string
  userId: string
  catalogId: string
  path: string
  customName: string | null
  customColor: string | null
  totalMinutes: number
  lastUsed: Date | null
  createdAt: Date
  updatedAt: Date
  catalog: AppCatalog
}

export interface UserAppWithDisplay extends UserApp {
  displayName: string
  displayColor: string
  isActive: boolean
  currentSession: AppSession | null
  hasInvalidPath?: boolean
}

export interface CreateAppInput {
  path: string
  catalogName: string
  customName?: string
  customColor?: string
}

export interface CreateAppRequest {
  token: string
  path: string
  catalogName: string
  customName?: string
  customColor?: string
  totalMinutes?: number
}

export interface UpdateAppRequest {
  token: string
  id: string
  totalMinutes?: number
  lastUsed?: Date
}

export interface ProcessInfo {
  displayName: string
  name: string
  path: string
  pid: string
  rawPath?: string
}

export interface LaunchResult {
  success: boolean
  error?: string
}

export interface ExecResult {
  stdout: string
  stderr: string
}

export interface GetAppsOptions {
  limit?: number
  page?: number
}