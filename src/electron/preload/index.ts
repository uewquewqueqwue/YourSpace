import { contextBridge, ipcRenderer } from 'electron'
import { setupDBAPI } from './modules/db'
import { setupMediaAPI } from './modules/media'
import { setupWindowAPI } from './modules/window'
import { setupAppsAPI } from './modules/apps'
import { setupUpdaterAPI } from './modules/updater'
import { setupToDoAPI } from './modules/todo'
import { setupEmailAPI } from './modules/email'
import { setupSystemAPI } from './modules/system'

contextBridge.exposeInMainWorld('electronAPI', {
  window: setupWindowAPI(),

  apps: setupAppsAPI(),

  updater: setupUpdaterAPI(),

  media: setupMediaAPI(),

  db: setupDBAPI(),

  todos: setupToDoAPI(),

  email: setupEmailAPI(),

  system: setupSystemAPI(),

  dialog: {
    showOpenDialog: (options: any) => ipcRenderer.invoke('dialog:showOpenDialog', options)
  },

  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  relaunchApp: () => ipcRenderer.send('relaunch-app:mainWindow')
})