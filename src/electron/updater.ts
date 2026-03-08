import type { BrowserWindow } from 'electron'
const { autoUpdater } = require('electron-updater')
import type { UpdateInfo, ProgressInfo } from 'electron-updater'

export function setupUpdater(mainWindow: BrowserWindow | null) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // autoUpdater.logger = log
  // autoUpdater.logger.transports.file.level = 'debug'
  
  // log.info('[Updater] Initialized')

  autoUpdater.on('checking-for-update', () => {
    // log.info('[Updater] Checking for updates...')
    mainWindow?.webContents.send('update-checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    // log.info('[Updater] Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    // log.info('[Updater] No updates available')
    mainWindow?.webContents.send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    // log.info('[Updater] Download progress:', progress.percent)
    mainWindow?.webContents.send('update-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    // log.info('[Updater] Update downloaded:', info.version)
    mainWindow?.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (err: Error) => {
    // log.error('[Updater] Error:', err)
    mainWindow?.webContents.send('update-error', err.message)
  })

  return {
    checkForUpdates: () => {
      // log.info('[Updater] Manual check triggered')
      return autoUpdater.checkForUpdatesAndNotify()
    },
    downloadUpdate: () => {
      // log.info('[Updater] Download triggered')
      return autoUpdater.downloadUpdate()
    },
    installUpdate: () => {
      // log.info('[Updater] Install triggered')
      return autoUpdater.quitAndInstall()
    }
  }
}