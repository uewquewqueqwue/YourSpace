import { Menu, Tray, type BrowserWindow, nativeImage, app, ipcMain } from 'electron'
import { logger } from '../../server/utils/logger'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow, iconPath: string, log: any) {
  try {
    logger.info(`Setting up tray with icon: ${iconPath}`)
    const image = nativeImage.createFromPath(iconPath)

    if (image.isEmpty()) {
      logger.error('Tray icon image is empty')
      throw new Error('Image is empty')
    }

    logger.info('Creating tray instance...')
    tray = new Tray(image)
    logger.info('Tray instance created')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Your Space",
        enabled: false
      },
      { type: 'separator' },
      {
        label: "Quit Your Space",
        click: () => {
          logger.info('App quitting from tray...')

          mainWindow.webContents.send('app-closing')

          ipcMain.once("sync-complete", () => {
            logger.info('Sync completed, quitting...')
            mainWindow.destroy()
            app.quit()
          })

          setTimeout(() => {
            logger.error('Sync timeout, force quitting')
            mainWindow.destroy()
            app.quit()
          }, 3500)
        }
      }
    ])

    tray.setToolTip("Your Space")
    tray.setContextMenu(contextMenu)

    tray.on("click", () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    })

    logger.info('Tray setup completed successfully')
  } catch (err) {
    logger.error('Tray setup error:', err)
    log(`Tray error: ${err}`)
    tray = null
  }
}

export function isTrayCreated(): boolean {
  return tray !== null
}

export function getTray(): Tray | null {
  return tray
}