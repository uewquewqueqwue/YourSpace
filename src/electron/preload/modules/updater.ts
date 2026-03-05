import { ipcRenderer } from 'electron'

export function setupUpdaterAPI() {
  return {
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
  }
}