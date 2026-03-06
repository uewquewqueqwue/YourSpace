import { contextBridge, ipcRenderer } from 'electron'
import { setupLogger } from './modules/logger'
import { setupWindowAPI } from './modules/window'
import { setupAppsAPI } from './modules/apps'
import { setupUpdaterAPI } from './modules/updater'
import { setupDBAPI } from './modules/db'
import { setupMediaAPI } from './modules/media'

setupLogger()

// Явно указываем типы для exposeInMainWorld
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  expandWindow: () => ipcRenderer.send('expand-window'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // Process monitoring
  getRunningApps: (options?: any) => ipcRenderer.invoke('get-running-apps', options),
  getRunningAppsCount: () => ipcRenderer.invoke('get-running-apps-count'),
  getRecentApps: () => ipcRenderer.invoke('get-recent-apps'),
  
  // App management
  launchApp: (appPath: string) => ipcRenderer.invoke('launch-app', appPath),
  execCommand: (command: string) => ipcRenderer.invoke('exec-command', command),
  
  // Lifecycle
  onAppClosing: (callback: () => Promise<void>) => {
    ipcRenderer.on('app-closing', async () => {
      await callback()
      ipcRenderer.send('sync-complete')
    })
  },
  log: (level: string, ...args: any[]) => ipcRenderer.send('log', { level, message: args.join(' ') }),

  // Auto-updater
  onUpdateChecking: (callback: () => void) => {
    ipcRenderer.on('update-checking', callback)
  },
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info))
  },
  onUpdateNotAvailable: (callback: () => void) => {
    ipcRenderer.on('update-not-available', callback)
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-progress', (_, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info))
  },
  onUpdateError: (callback: (error: string) => void) => {
    ipcRenderer.on('update-error', (_, error) => callback(error))
  },
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),

  // Media API
  media: setupMediaAPI(),

  // Database API
  db: setupDBAPI()
})