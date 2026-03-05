import { ipcRenderer } from 'electron'

export function setupAppsAPI() {
  return {
    getRunningApps: (options?: any) => ipcRenderer.invoke('get-running-apps', options),
    getRunningAppsCount: () => ipcRenderer.invoke('get-running-apps-count'),
    getRecentApps: () => ipcRenderer.invoke('get-recent-apps'),
    launchApp: (appPath: string) => ipcRenderer.invoke('launch-app', appPath),
    execCommand: (command: string) => ipcRenderer.invoke('exec-command', command)
  }
}