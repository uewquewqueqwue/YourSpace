import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  expandWindow: () => ipcRenderer.send('expand-window'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  getRunningApps: (options?: any) => ipcRenderer.invoke('get-running-apps', options),
  getRunningAppsCount: () => ipcRenderer.invoke('get-running-apps-count'),
  getRecentApps: () => ipcRenderer.invoke('get-recent-apps'),
  launchApp: (appPath: string) => ipcRenderer.invoke('launch-app', appPath),
  execCommand: (command: string) => ipcRenderer.invoke('exec-command', command),

  onAppClosing: (callback: () => Promise<void>) => {
    ipcRenderer.on('app-closing', async () => {
      await callback()
      ipcRenderer.send('sync-complete', true)
    })
  },
  
  log: (level: string, ...args: any[]) => {
    const message = args.join(' ')
    ipcRenderer.send('log', { level, message, timestamp: Date.now() })
  },

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
  installUpdate: () => ipcRenderer.send('install-update')
})