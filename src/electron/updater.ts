import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

export function setupUpdater(mainWindow: BrowserWindow | null) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for updates...')
    mainWindow?.webContents.send('update-checking')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] No updates available')
    mainWindow?.webContents.send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version)
    mainWindow?.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err)
    mainWindow?.webContents.send('update-error', err.message)
  })

  return {
    checkForUpdates: () => autoUpdater.checkForUpdatesAndNotify(),
    downloadUpdate: () => autoUpdater.downloadUpdate(),
    installUpdate: () => autoUpdater.quitAndInstall()
  }
}