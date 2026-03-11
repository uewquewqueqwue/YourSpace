import { loadEnv, writeDebug } from './preload-env'
loadEnv()

import path from 'path'
import { app, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'url'
import { createMainWindow, getIconPath } from './windows/mainWindow'
import { setupAppHandlers } from './handlers/apps'
import { setupWindowHandlers } from './handlers/window'
import { setupUpdater } from './updater'
import { setupAuthHandlers } from '../../server/handlers/auth'
import { setupAppsHandlers } from '../../server/handlers/apps'
import { setupCatalogsHandlers } from '../../server/handlers/catalogs'
import { setupVersionsHandlers } from '../../server/handlers/versions'
import { setupTodoHandlers } from '../../server/handlers/todo'
import { setupMediaHandlers } from "./handlers/media"
import { setupTray, isTrayCreated, getTray } from './tray'
import { mainLog } from '@/log/logger'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: Electron.BrowserWindow | null = null
let updater: ReturnType<typeof setupUpdater> | null = null
let isQuitting = false

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    mainLog.info('================================')
    mainLog.success('App started successfully')

    const preloadPath = path.join(__dirname, '../preload/index.js')
    const iconPath = getIconPath(process.platform, __dirname)
    const isDev = process.env.NODE_ENV === 'development'

    mainWindow = createMainWindow({ preloadPath, iconPath, isDev })

    try {
      setupTray(mainWindow, iconPath, writeDebug)
      mainLog.success('Tray created successfully')
    } catch (error) {
      writeDebug(`Tray creation failed: ${error}`)
    }

    mainWindow.on('close', (event) => {
      if (isQuitting) {
        mainWindow = null
        return true
      }
      
      if (!isTrayCreated()) {
        return true
      }
      
      event.preventDefault()
      mainWindow?.hide()
      
      const tray = getTray()
      if (tray) {
        tray.displayBalloon({
          title: 'Приложение свернуто',
          content: 'Приложение продолжает работу в трее'
        })
      }
      
      return false
    })

    updater = setupUpdater(mainWindow)

    setupAuthHandlers()
    setupAppsHandlers()
    setupCatalogsHandlers()
    setupVersionsHandlers()
    setupAppHandlers()
    setupWindowHandlers(mainWindow)
    setupMediaHandlers()
    setupTodoHandlers()

    ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
      return dialog.showOpenDialog(options)
    })

    ipcMain.on('check-for-updates', () => {
      updater?.checkForUpdates()
    })

    ipcMain.on('download-update', () => {
      updater?.downloadUpdate()
    })

    ipcMain.on('install-update', () => {
      updater?.installUpdate()
    })

    ipcMain.on('relaunch-app:mainWindow', () => {
      app.relaunch()
      app.exit(0)
    })

    ipcMain.on('quit-app', () => {
      isQuitting = true
      app.quit()
    })

    ipcMain.on('show-window', () => {
      if (mainWindow) {
        mainWindow.show()
        mainWindow.focus()
      }
    })

    mainLog.success('Main window created')
    mainLog.info('Updater instance:', updater ? 'yes' : 'no')

    if (!isDev) {
      setTimeout(() => {
        updater?.checkForUpdates()
      }, 3000)
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' || isQuitting) {
      app.quit()
    }
  })
}