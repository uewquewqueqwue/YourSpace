import { BrowserWindow, app } from 'electron'
import path from 'path'

interface CreateWindowOptions {
  preloadPath: string
  iconPath: any
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
    title: "Your Space",
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
    win.title = "Your Space [DEV]"
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist/renderer/index.html')
    win.loadFile(indexPath)
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  return win
}

export function getIconPath(platform: string, baseDir: string): string {
  const iconName = platform === 'win32' ? 'logo.ico' : 'logo.png'
  
  if (app.isPackaged) {
    return path.join(process.resourcesPath, iconName)
  } else {
    return path.join(baseDir, '../../public/logo', iconName)
  }
}