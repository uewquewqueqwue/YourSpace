import { ipcMain, BrowserWindow, screen } from 'electron'

export function setupWindowHandlers(win: BrowserWindow | null) {
  ipcMain.on('expand-window', () => {
    if (!win) return

    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    const x = Math.floor((width - 1600) / 2)
    const y = Math.floor((height - 800) / 2)

    win.setBounds({ x, y, width: 1600, height: 800 })
    win.setResizable(true)
    win.setMinimumSize(1600, 800)
  })

  ipcMain.on('window-minimize', () => {
    win?.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('window-hide-tray', () => {
    win?.hide()
  })

  ipcMain.on('window-close', () => {
    win?.close()
  })
}