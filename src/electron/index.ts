import log from 'electron-log'
import { app, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { createMainWindow, getIconPath } from './windows/mainWindow'
import { setupAppHandlers } from './handlers/apps'
import { setupWindowHandlers } from './handlers/window'
import { setupUpdater } from './updater'
import { setupAuthHandlers } from '@server/handlers/auth'
import { setupAppsHandlers } from '@server/handlers/apps'
import { setupCatalogsHandlers } from '@server/handlers/catalogs'
import { setupVersionsHandlers } from '@server/handlers/versions'
import dotenv from 'dotenv'
import fs from 'fs'

log.transports.file.level = 'debug'
log.transports.console.level = 'debug'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

log.info('App starting...')

if (app.isPackaged) {
  const envPath = path.join(process.resourcesPath, '.env')
  log.info('Looking for .env at:', envPath)
  
  if (fs.existsSync(envPath)) {
    log.info('.env file exists, size:', fs.statSync(envPath).size)
    
    const content = fs.readFileSync(envPath, 'utf8')
    const firstLine = content.split('\n')[0]
    log.info('First line type:', firstLine.startsWith('DATABASE_URL') ? 'DATABASE_URL' : 'other')
    
    dotenv.config({ path: envPath })
    log.info('DATABASE_URL loaded:', !!process.env.DATABASE_URL)
  } else {
    log.error('.env NOT found!')
  }
} else {
  dotenv.config()
  log.info('Dev mode, .env loaded')
}

let mainWindow: Electron.BrowserWindow | null = null
let updater: ReturnType<typeof setupUpdater> | null = null

if (app.isPackaged) {
  const envPath = path.join(process.resourcesPath, '.env')
  dotenv.config({ path: envPath })
} else {
  dotenv.config()
}

ipcMain.on('log', (event, { level, timestamp, message }) => {
  const colors = {
    info: '\x1b[36m',
    error: '\x1b[31m',
    warn: '\x1b[33m'
  }
  const reset = '\x1b[0m'
  console.log(`${colors[level as keyof typeof colors]}[${timestamp}] ${message}${reset}`)
})

app.whenReady().then(() => {
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
  
  ipcMain.on('check-for-updates', () => {
    updater?.checkForUpdates()
  })
  
  ipcMain.on('download-update', () => {
    updater?.downloadUpdate()
  })
  
  ipcMain.on('install-update', () => {
    updater?.installUpdate()
  })

  console.log('\x1b[36m[Main] App ready, window created\x1b[0m')

  if (!isDev) {
    setTimeout(() => {
      updater?.checkForUpdates()
    }, 3000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    process.exit(0)
  }
})