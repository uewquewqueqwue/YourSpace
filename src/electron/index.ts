import { loadEnv } from './preload-env'
loadEnv()

import fs from 'fs'
import path from 'path'
import { app, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { createMainWindow, getIconPath } from './windows/mainWindow'
import { setupAppHandlers } from './handlers/apps'
import { setupWindowHandlers } from './handlers/window'
import { setupUpdater } from './updater'
import { setupAuthHandlers } from '../../server/handlers/auth'
import { setupAppsHandlers } from '../../server/handlers/apps'
import { setupCatalogsHandlers } from '../../server/handlers/catalogs'
import { setupVersionsHandlers } from '../../server/handlers/versions'
import { setupMediaHandlers } from "./handlers/media"
import log from 'electron-log'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: Electron.BrowserWindow | null = null
let updater: ReturnType<typeof setupUpdater> | null = null

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData')
  const logsPath = path.join(userDataPath, 'logs')
  if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath, { recursive: true })
  
  log.transports.file.resolvePath = () => path.join(logsPath, 'main.log')
  log.transports.file.level = 'debug'
  log.transports.console.level = 'debug'
  
  log.info('================================')
  log.info('App started successfully')
  log.info('DATABASE_URL loaded:', !!process.env.DATABASE_URL)
  log.info('JWT_SECRET loaded:', !!process.env.JWT_SECRET)

  const preloadPath = path.join(__dirname, '../preload/index.js')
  const iconPath = getIconPath(process.platform, __dirname)
  const isDev = process.env.NODE_ENV === 'development'
  
  mainWindow = createMainWindow({ preloadPath, iconPath, isDev })
  updater = setupUpdater(mainWindow)
  
  setupAuthHandlers()
  setupAppsHandlers()
  setupCatalogsHandlers()
  setupVersionsHandlers()
  setupAppHandlers()
  setupWindowHandlers(mainWindow)
  setupMediaHandlers()
  
  ipcMain.on('check-for-updates', () => {
    updater?.checkForUpdates()
  })
  
  ipcMain.on('download-update', () => {
    updater?.downloadUpdate()
  })
  
  ipcMain.on('install-update', () => {
    updater?.installUpdate()
  })

  log.info('[Main] Main window created')
  log.info('[Main] Updater instance:', updater ? 'yes' : 'no')
  
  // if (!isDev) {
  setTimeout(() => {
    log.info('[Main] Triggering update check...')
    updater?.checkForUpdates()
  }, 3000)
  
  log.info('[Main] isDev:', isDev)
})

ipcMain.on('log', (event, { level, timestamp, message }) => {
  const colors = {
    info: '\x1b[36m',
    error: '\x1b[31m',
    warn: '\x1b[33m'
  }
  const reset = '\x1b[0m'
  const logMsg = `${colors[level as keyof typeof colors]}[${timestamp}] ${message}${reset}`
  console.log(logMsg)
  
  if (level === 'error') log.error(message)
  else if (level === 'warn') log.warn(message)
  else log.info(message)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    log.info('App quitting...')
    app.quit()
    process.exit(0)
  }
})