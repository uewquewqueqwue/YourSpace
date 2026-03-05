import { app, ipcMain } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { createMainWindow, getIconPath } from './windows/mainWindow'
import { setupAppHandlers } from './handlers/apps'
import { setupWindowHandlers } from './handlers/window'
import { setupUpdater } from './updater'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: Electron.BrowserWindow | null = null
let updater: ReturnType<typeof setupUpdater> | null = null

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

  console.log('\x1b[36m[Main] App ready, window created')

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