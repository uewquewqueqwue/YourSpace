import { ipcRenderer } from 'electron'

export function setupWindowAPI() {
  return {
    expandWindow: () => ipcRenderer.send('expand-window'),
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    hideToTray: () => ipcRenderer.send('hide-to-tray'),
    show: () => ipcRenderer.send('show-window'),
    quit: () => ipcRenderer.send('quit-app'),

    onAppClosing: (callback: () => Promise<void>) => {
      ipcRenderer.on('app-closing', async () => {
        await callback()
        ipcRenderer.send('sync-complete', true)
      })
    }
  }
}