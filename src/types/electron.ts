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
  onAppClosing: (callback: () => void) => void
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
}

export interface UpdateInfo {
  version: string
  files: Array<{ url: string; size: number }>
  path: string
  sha512: string
  releaseDate: string
  releaseName?: string
  releaseNotes?: string
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  total: number
  transferred: number
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}