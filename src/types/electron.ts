import type { 
  ProcessInfo, 
  LaunchResult, 
  ExecResult, 
  GetAppsOptions 
} from './apps'
import type { UpdateInfo, UpdateProgress } from './versions'
import type { 
  LoginResponse, 
  RegisterResponse, 
  User,
  UpdateProfileRequest 
} from './user'
import type { 
  UserAppWithDisplay, 
  CreateAppRequest, 
  UpdateAppRequest 
} from './apps'
import type { CreateVersionRequest, AppVersion } from './versions'

export interface DBApi {
  // Auth
  login: (email: string, password: string) => Promise<LoginResponse>
  register: (name: string, email: string, password: string) => Promise<RegisterResponse>
  logout: (token: string) => Promise<{ success: boolean }>
  getMe: (token: string) => Promise<User>
  updateProfile: (token: string, name: string, avatar: string) => Promise<User>

  // Apps
  getApps: (token: string) => Promise<UserAppWithDisplay[]>
  createApp: (token: string, data: Omit<CreateAppRequest, 'token'>) => Promise<UserAppWithDisplay>
  updateApp: (token: string, id: string, data: Omit<UpdateAppRequest, 'token' | 'id'>) => Promise<UserAppWithDisplay>
  deleteApp: (token: string, id: string) => Promise<{ success: boolean }>

  // Catalogs
  getCatalogs: (token: string) => Promise<any[]>
  updateCatalog: (token: string, id: string, data: any) => Promise<any>

  // Versions
  getLatestVersion: () => Promise<AppVersion>
  createVersion: (version: string, patchNotes: any[]) => Promise<AppVersion>
}

export interface ElectronAPI {
  // Window controls
  expandWindow: () => void
  minimize: () => void
  maximize: () => void
  close: () => void
  
  // Process monitoring
  getRunningApps: (options?: GetAppsOptions) => Promise<ProcessInfo[]>
  getRunningAppsCount: () => Promise<number>
  getRecentApps: () => Promise<Array<{ name: string; path: string; lastAccessed: number }>>
  
  // App management
  launchApp: (appPath: string) => Promise<LaunchResult>
  execCommand: (command: string) => Promise<ExecResult>
  
  // Lifecycle
  onAppClosing: (callback: () => Promise<void>) => void
  log: (level: string, ...args: any[]) => void

  // Auto-updater
  onUpdateChecking: (callback: () => void) => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (callback: () => void) => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
  onUpdateError: (callback: (error: string) => void) => void
  checkForUpdates: () => void
  downloadUpdate: () => void
  installUpdate: () => void

  // Database API
  db: DBApi
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}