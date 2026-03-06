// main/index-minimal.ts
import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'

try {
  const possiblePaths = [
    path.join(process.resourcesPath || '', '.env'),
    path.join(__dirname, '../../.env'),
    path.join(process.cwd(), '.env'),
    path.join(path.dirname(process.execPath), '.env'),
    path.join(path.dirname(process.execPath), 'resources', '.env'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', '.env'),
  ]
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+?)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, '')
          process.env[key] = value
          console.log(`✅ ENV: ${key}=${value.substring(0, 10)}...`)
        }
      })
      console.log('✅ Loaded .env from:', envPath)
      break
    }
  }
} catch (e) {
  console.error('❌ Failed to load .env:', e)
}

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  })
  
   win.webContents.on('did-finish-load', () => {
    win.webContents.executeJavaScript(`
      console.log('✅ DATABASE_URL loaded:', ${!!process.env.DATABASE_URL});
      console.log('✅ JWT_SECRET loaded:', ${!!process.env.JWT_SECRET});
    `);
  });

  win.loadURL('http://localhost:5173')
  win.webContents.openDevTools()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})