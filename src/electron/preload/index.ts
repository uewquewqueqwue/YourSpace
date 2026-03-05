import { contextBridge } from 'electron'
import { setupLogger } from './modules/logger'
import { setupWindowAPI } from './modules/window'
import { setupAppsAPI } from './modules/apps'
import { setupUpdaterAPI } from './modules/updater'
import { setupDBAPI } from './modules/db'

setupLogger()

contextBridge.exposeInMainWorld('electronAPI', {
  ...setupWindowAPI(),
  ...setupAppsAPI(),
  ...setupUpdaterAPI(),
  db: setupDBAPI()
})