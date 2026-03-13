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
import type {
  CreateTodoRequest,
  UserTodoResponse,
  UpdateTodoRequest,
  TodoTagResponse,
  CreateFolderRequest,
  TodoFolderResponse,
  CreateTagRequest,
  UpdateFolderRequest,
  UpdateTagRequest,
} from "./todo"
import type { AppVersion } from './versions'
import type { MediaAPI } from './media'
import type {
  ConnectAccountResponse,
  CallbackResponse,
  ListAccountsResponse,
  DisconnectAccountResponse,
  ListEmailsResponse,
  MarkReadResponse,
  SearchEmailsResponse,
  TriggerSyncResponse
} from './email'

export interface DBApi {
  login: (email: string, password: string) => Promise<LoginResponse>
  register: (name: string, email: string, password: string) => Promise<RegisterResponse>
  logout: (token: string) => Promise<{ success: boolean }>
  getMe: (token: string) => Promise<User>
  updateProfile: (token: string, data: any) => Promise<User>
  getApps: (token: string) => Promise<UserAppWithDisplay[]>
  createApp: (token: string, data: Omit<CreateAppRequest, 'token'>) => Promise<UserAppWithDisplay>
  updateApp: (token: string, id: string, data: Omit<UpdateAppRequest, 'token' | 'id'>) => Promise<UserAppWithDisplay>
  deleteApp: (token: string, id: string) => Promise<{ success: boolean }>
  getCatalogs: () => Promise<any[]>
  createCatalog: (data: any) => Promise<any>
  getLatestVersion: () => Promise<AppVersion>
  getVersionPatches: (version: string) => Promise<AppVersion>
  createVersion: (version: string, patchNotes: any[]) => Promise<AppVersion>
  batchUpdateApps: (token: string, updates: Array<{ id: string; totalMinutes?: number; lastUsed?: Date }>) => Promise<any>
}

export interface WindowAPI {
  expandWindow: () => void
  minimize: () => void
  maximize: () => void
  hideTray: () => void
  onAppClosing: (callback: () => Promise<void>) => void
}

export interface AppsAPI {
  getRunningApps: (options?: GetAppsOptions) => Promise<ProcessInfo[]>
  getRunningAppsCount: () => Promise<number>
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

export interface ToDoAPI {
  getAll: (token: string) => Promise<UserTodoResponse[]>
  create: (token: string, data: CreateTodoRequest) => Promise<UserTodoResponse>
  update: (token: string, id: string, data: UpdateTodoRequest) => Promise<UserTodoResponse>
  delete: (token: string, id: string) => Promise<{ success: boolean }>
  reorder: (token: string, items: { id: string; position: number }[]) => Promise<UserTodoResponse[]>
  
  folders: {
    getAll: (token: string) => Promise<TodoFolderResponse[]>
    create: (token: string, data: CreateFolderRequest) => Promise<TodoFolderResponse>
    update: (token: string, id: string, data: UpdateFolderRequest) => Promise<TodoFolderResponse>
    delete: (token: string, id: string) => Promise<{ success: boolean }>
  }
  
  tags: {
    getAll: (token: string) => Promise<TodoTagResponse[]>
    create: (token: string, data: CreateTagRequest) => Promise<TodoTagResponse>
    update: (token: string, id: string, data: UpdateTagRequest) => Promise<TodoTagResponse>
    delete: (token: string, id: string) => Promise<{ success: boolean }>
  }
}

export interface EmailAPI {
  accounts: {
    connect: (token: string) => Promise<ConnectAccountResponse>
    callback: (code: string, state: string) => Promise<CallbackResponse>
    list: (token: string) => Promise<ListAccountsResponse>
    disconnect: (token: string, accountId: string) => Promise<DisconnectAccountResponse>
  }
  
  sync: {
    trigger: (token: string) => Promise<TriggerSyncResponse>
  }
  
  list: (token: string, options?: { accountId?: string; isRead?: boolean; limit?: number; offset?: number }) => Promise<ListEmailsResponse>
  markRead: (token: string, emailId: string, isRead: boolean) => Promise<MarkReadResponse>
  search: (token: string, query: string, options?: { accountId?: string; limit?: number }) => Promise<SearchEmailsResponse>
  unreadCount: (token: string) => Promise<{ success: boolean; count: number }>
}

export interface SystemAPI {
  getStats: () => Promise<{
    success: boolean
    stats?: {
      cpu: { usage: number; cores: number }
      memory: { total: number; used: number; free: number; usagePercent: number }
      disk: { total: number; used: number; free: number; usagePercent: number; mount: string }
      network: { rx: number; tx: number }
      os: { platform: string; distro: string; release: string; arch: string; hostname: string }
      uptime: number
    }
    error?: string
  }>
  getCpuInfo: () => Promise<{
    success: boolean
    cpu?: {
      manufacturer: string
      brand: string
      speed: number
      cores: number
      physicalCores: number
      processors: number
      currentLoad: number
      cpus: Array<{ load: number }>
    }
    error?: string
  }>
  getProcesses: () => Promise<{
    success: boolean
    processes?: Array<{
      pid: number
      name: string
      cpu: number
      mem: number
      memVsz: number
      memRss: number
    }>
    total?: number
    error?: string
  }>
}

export interface ElectronAPI {
  window: WindowAPI

  apps: AppsAPI

  updater: UpdaterAPI
    
  media: MediaAPI
  
  db: DBApi

  todos: ToDoAPI

  email: EmailAPI

  system: SystemAPI

  dialog: {
    showOpenDialog: (options: any) => Promise<any>
  }

  openExternal: (url: string) => Promise<void>

  relaunchApp: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}