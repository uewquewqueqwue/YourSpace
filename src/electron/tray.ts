import { Menu, Tray, type BrowserWindow, nativeImage, app, ipcMain } from 'electron'
import { mainLog } from '@/log/logger'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow, iconPath: string, log: any) {
  try {
    const image = nativeImage.createFromPath(iconPath)

    if (image.isEmpty()) {
      throw new Error('Image is empty')
    }

    tray = new Tray(image)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Your Space",
        enabled: false
      },
      { type: 'separator' },
      {
        label: "Quit Your Space",
        click: () => {
          mainLog.success('App quitting from tray...')

          mainWindow.webContents.send('app-closing')

          ipcMain.once("sync-complete", () => {
            mainLog.success('Sync completed, quitting...')
            mainWindow.destroy()
            app.quit()
          })

          setTimeout(() => {
            mainLog.error('Sync timeout, force quitting')
            mainWindow.destroy()
            app.quit()
          }, 3000)
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

  } catch (err) {
    log(`Tray error: ${err}`)
  }
}