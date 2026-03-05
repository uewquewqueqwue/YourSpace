import { BrowserWindow } from 'electron'
import path from 'path'

interface CreateWindowOptions {
  preloadPath: string
  iconPath: string
  isDev: boolean
}

export function createMainWindow({ preloadPath, iconPath, isDev }: CreateWindowOptions): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    show: false,
    frame: false,
    resizable: true,
    transparent: true,
    center: true,
    minWidth: 400,
    minHeight: 300,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    ...(process.platform === 'win32' ? {
      titleBarStyle: 'hidden',
      titleBarOverlay: false
    } : {})
  })

  win.setVisibleOnAllWorkspaces(true)

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  return win
}

export function getIconPath(platform: string, baseDir: string): string {
  if (platform === 'win32') {
    return path.join(baseDir, '../../public/logo/logo.ico')
  }
  return path.join(baseDir, '../../public/logo/logo.png')
}