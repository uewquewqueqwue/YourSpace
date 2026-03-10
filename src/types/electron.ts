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


export interface ElectronAPI {
  window: WindowAPI

  apps: AppsAPI

  updater: UpdaterAPI
    
  media: MediaAPI
  
  db: DBApi

  todos: ToDoAPI

  dialog: {
    showOpenDialog: (options: any) => Promise<any>
  }

  relaunchApp: () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}