import { contextBridge, ipcRenderer } from 'electron'
import { setupDBAPI } from './modules/db'
import { setupMediaAPI } from './modules/media'
import { setupWindowAPI } from './modules/window'
import { setupAppsAPI } from './modules/apps'
import { setupUpdaterAPI } from './modules/updater'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  window: setupWindowAPI(),
  
  // Process monitoring
  apps: setupAppsAPI(),

  // Auto-updater
  updater: setupUpdaterAPI(),

  // Media API
  media: setupMediaAPI(),
  
  // Database API
  db: setupDBAPI(),
  
  relaunchApp: () => ipcRenderer.send('relaunch-app:mainWindow')
})