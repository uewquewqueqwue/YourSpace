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
} from './user'
import type {
  UserAppWithDisplay,
  CreateAppRequest,
  UpdateAppRequest
} from './apps'
import type { AppVersion } from './versions'
import type { MediaAPI } from './media'

export interface DBApi {
  login: (email: string, password: string) => Promise<LoginResponse>
  register: (name: string, email: string, password: string) => Promise<RegisterResponse>
  logout: (token: string) => Promise<{ success: boolean }>
  getMe: (token: string) => Promise<User>
  updateProfile: (token: string, name: string, avatar: string) => Promise<User>
  getApps: (token: string) => Promise<UserAppWithDisplay[]>
  createApp: (token: string, data: Omit<CreateAppRequest, 'token'>) => Promise<UserAppWithDisplay>
  updateApp: (token: string, id: string, data: Omit<UpdateAppRequest, 'token' | 'id'>) => Promise<UserAppWithDisplay>
  deleteApp: (token: string, id: string) => Promise<{ success: boolean }>
  getCatalogs: (token: string) => Promise<any[]>
  updateCatalog: (token: string, id: string, data: any) => Promise<any>
  getLatestVersion: () => Promise<AppVersion>
  createVersion: (version: string, patchNotes: any[]) => Promise<AppVersion>
}

export interface WindowAPI {
  expandWindow: () => void
  minimize: () => void
  maximize: () => void
  close: () => void
  onAppClosing: (callback: () => Promise<void>) => void
}

export interface AppsAPI {
  getRunningApps: (options?: GetAppsOptions) => Promise<ProcessInfo[]>
  getRunningAppsCount: () => Promise<number>
  getRecentApps: () => Promise<Array<{ name: string; path: string; lastAccessed: number }>>
  launchApp: (appPath: string) => Promise<LaunchResult>
  execCommand: (command: string) => Promise<ExecResult>
}


export interface UpdaterAPI {
  onUpdateChecking: (callback: () => void) => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (callback: () => void) => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
  onUpdateError: (callback: (error: string) => void) => void
  checkForUpdates: () => void
  downloadUpdate: () => void
  installUpdate: () => void
}


export interface ElectronAPI {

  expandWindow: () => void
  minimize: () => void
  maximize: () => void
  close: () => void


  getRunningApps: (options?: GetAppsOptions) => Promise<ProcessInfo[]>
  getRunningAppsCount: () => Promise<number>
  getRecentApps: () => Promise<Array<{ name: string; path: string; lastAccessed: number }>>


  launchApp: (appPath: string) => Promise<LaunchResult>
  execCommand: (command: string) => Promise<ExecResult>


  onAppClosing: (callback: () => Promise<void>) => void
  log: (level: string, ...args: any[]) => void


  onUpdateChecking: (callback: () => void) => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
  onUpdateNotAvailable: (callback: () => void) => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void
  onUpdateError: (callback: (error: string) => void) => void
  checkForUpdates: () => void
  downloadUpdate: () => void
  installUpdate: () => void


  media: MediaAPI


  db: DBApi
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}