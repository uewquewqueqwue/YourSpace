import { contextBridge, ipcRenderer } from 'electron'
import { setupDBAPI } from './modules/db'
import { setupMediaAPI } from './modules/media'
import { setupWindowAPI } from './modules/window'
import { setupAppsAPI } from './modules/apps'
import { setupUpdaterAPI } from './modules/updater'
import { setupToDoAPI } from './modules/todo'

contextBridge.exposeInMainWorld('electronAPI', {
  window: setupWindowAPI(),

  apps: setupAppsAPI(),

  updater: setupUpdaterAPI(),

  media: setupMediaAPI(),

  db: setupDBAPI(),

  todos: setupToDoAPI(),

  dialog: {
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options)
  },

  relaunchApp: () => ipcRenderer.send('relaunch-app:mainWindow')
})