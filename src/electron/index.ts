import { app, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import dotenv from 'dotenv'
import log from 'electron-log'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Настройка логов
const userDataPath = app.getPath('userData')
const logsPath = path.join(userDataPath, 'logs')
if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath, { recursive: true })
log.transports.file.resolvePath = () => path.join(logsPath, 'main.log')
log.info('================================')
log.info('App starting...')

// Загрузка .env
try {
  if (app.isPackaged) {
    // В проде .env лежит в resources
    const envPath = path.join(process.resourcesPath, '.env')
    log.info('📁 Looking for .env at:', envPath)
    
    if (fs.existsSync(envPath)) {
      log.info('✅ .env file exists, size:', fs.statSync(envPath).size)
      
      // Читаем и загружаем
      const envConfig = dotenv.parse(fs.readFileSync(envPath))
      Object.assign(process.env, envConfig)
      
      log.info('✅ DATABASE_URL loaded:', !!process.env.DATABASE_URL)
      log.info('✅ JWT_SECRET loaded:', !!process.env.JWT_SECRET)
    } else {
      log.error('❌ .env NOT found!')
    }
  } else {
    // В деве из корня
    dotenv.config()
    log.info('✅ Dev mode, .env loaded from project root')
  }
} catch (error) {
  log.error('❌ Error loading .env:', error)
}

// Проверка критических переменных
if (!process.env.DATABASE_URL) {
  log.error('❌ DATABASE_URL is not defined!')
  app.quit()
  process.exit(1)
}

// Остальные импорты
import { createMainWindow, getIconPath } from './windows/mainWindow'
import { setupAppHandlers } from './handlers/apps'
import { setupWindowHandlers } from './handlers/window'
import { setupUpdater } from './updater'
import { setupAuthHandlers } from '../../server/handlers/auth'
import { setupAppsHandlers } from '../../server/handlers/apps'
import { setupCatalogsHandlers } from '../../server/handlers/catalogs'
import { setupVersionsHandlers } from '../../server/handlers/versions'

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