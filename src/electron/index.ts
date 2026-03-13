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
import { setupEmailHandlers } from '../../server/handlers/email'
import { setupSystemHandlers } from '../../server/handlers/system'
import { setupMediaHandlers } from "./handlers/media"
import { setupTray, isTrayCreated, getTray } from './tray'
import { logger } from '../../server/utils/logger'
import { syncService } from '../../server/services/SyncService'

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
    logger.info('================================')
    logger.info('App started successfully')

    const preloadPath = path.join(__dirname, '../preload/index.js')
    const iconPath = getIconPath(process.platform, __dirname)
    const isDev = process.env.NODE_ENV === 'development'

    mainWindow = createMainWindow({ preloadPath, iconPath, isDev })

    try {
      setupTray(mainWindow, iconPath, writeDebug)
      logger.info('Tray created successfully')
      
      // Verify tray was actually created
      if (!isTrayCreated()) {
        logger.error('Tray creation failed - tray is null')
        writeDebug('Tray creation failed - tray is null')
      } else {
        logger.info('Tray verified - minimize to tray enabled')
      }
    } catch (error) {
      logger.error('Tray creation error:', error)
      writeDebug(`Tray creation failed: ${error}`)
    }

    mainWindow.on('close', (event) => {
      logger.info('Window close event triggered')
      
      if (isQuitting) {
        logger.info('App is quitting, allowing window to close')
        mainWindow = null
        return
      }
      
      if (!isTrayCreated()) {
        logger.warn('Tray not created, allowing window to close')
        return
      }
      
      logger.info('Preventing close, hiding window to tray')
      event.preventDefault()
      mainWindow?.hide()
      
      const tray = getTray()
      if (tray) {
        tray.displayBalloon({
          title: 'Приложение свернуто',
          content: 'Приложение продолжает работу в трее'
        })
      }
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
    setupEmailHandlers()
    setupSystemHandlers()

    // Start email sync scheduler
    // Requirements: 3.2, 3.6
    syncService.startScheduler()
    logger.info('Email sync scheduler started')

    ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
      return dialog.showOpenDialog(options)
    })

    ipcMain.handle('shell:openExternal', async (event, url: string) => {
      const { shell } = await import('electron')
      await shell.openExternal(url)
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

    logger.info('Main window created')
    logger.info('Updater instance:', updater ? 'yes' : 'no')

    if (!isDev) {
      setTimeout(() => {
        updater?.checkForUpdates()
      }, 3000)
    }
  })

  app.on('before-quit', () => {
    isQuitting = true
    
    // Stop email sync scheduler
    // Requirements: 3.2, 3.6
    syncService.stopScheduler()
    logger.info('Email sync scheduler stopped')
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' || isQuitting) {
      app.quit()
    }
  })
}