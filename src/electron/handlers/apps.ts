import { ipcMain } from 'electron'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { parseWmicLine, isSystemProcess } from '../utils/processHelpers'
import type { ProcessInfo, LaunchResult, GetAppsOptions } from '@/types/electron'

const execAsync = promisify(exec)

async function getUniqueProcesses(): Promise<ProcessInfo[]> {
  try {
    const { stdout } = await execAsync('wmic process get Caption,ExecutablePath,ProcessId /format:csv')
    
    const lines = stdout.split('\n')
      .filter(line => line.trim())
      .slice(1)
    
    const allProcesses = lines
      .map(line => parseWmicLine(line))
      .filter((p): p is ProcessInfo => p !== null)
      .filter(p => !isSystemProcess(p))
    
    const seen = new Map<string, ProcessInfo>()
    
    for (const p of allProcesses) {
      if (!seen.has(p.displayName)) {
        seen.set(p.displayName, p)
      }
    }
    
    const uniqueProcesses = Array.from(seen.values())
    uniqueProcesses.sort((a, b) => a.displayName.localeCompare(b.displayName))
    
    return uniqueProcesses
  } catch (error) {
    console.error('Error getting processes:', error)
    return []
  }
}

async function getRunningAppsCount(): Promise<number> {
  try {
    const processes = await getUniqueProcesses()
    return processes.length
  } catch (error) {
    console.error('Error getting processes count:', error)
    return 0
  }
}

async function getRunningAppsWindows(options?: GetAppsOptions): Promise<ProcessInfo[]> {
  try {
    const uniqueProcesses = await getUniqueProcesses()
    
    if (options?.limit && options?.page) {
      const start = (options.page - 1) * options.limit
      const end = start + options.limit
      return uniqueProcesses.slice(start, end)
    }
    
    if (options?.limit) {
      return uniqueProcesses.slice(0, options.limit)
    }
    
    return uniqueProcesses
  } catch (error) {
    console.error('Error getting processes:', error)
    return []
  }
}

async function getRecentAppsWindows() {
  try {
    const recentPath = path.join(process.env.USERPROFILE || '', 'Recent')
    const files = await fs.readdir(recentPath).catch(() => [])
    
    const apps = await Promise.all(
      files.slice(0, 10).map(async (file) => {
        const filePath = path.join(recentPath, file)
        try {
          const stats = await fs.stat(filePath)
          if (file.endsWith('.lnk') || file.endsWith('.url')) return null
          
          return {
            name: file,
            path: filePath,
            lastAccessed: stats.atimeMs
          }
        } catch {
          return null
        }
      })
    )
    
    return apps
      .filter((app): app is NonNullable<typeof app> => app !== null)
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, 6)
  } catch (error) {
    console.error('Error getting recent apps:', error)
    return []
  }
}

async function launchApp(appPath: string): Promise<LaunchResult> {
  try {
    try {
      await fs.access(appPath)
    } catch {
      return { success: false, error: 'File not found' }
    }

    if (appPath.endsWith('.exe')) {
      const child = spawn(appPath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        shell: false
      })
      child.unref()
    } 
    else if (appPath.endsWith('.lnk')) {
      await execAsync(`start "" "${appPath}"`, { 
        shell: 'cmd.exe',
        windowsHide: true 
      })
    }
    else {
      const child = spawn(appPath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        shell: true
      })
      child.unref()
    }
    
    return { success: true }
  } catch (error) {
    const err = error as Error
    console.error('Launch error:', err)
    return { success: false, error: err.message }
  }
}

export function setupAppHandlers() {
  ipcMain.handle('get-running-apps', async (event, options?: GetAppsOptions) => {
    if (process.platform === 'win32') {
      return await getRunningAppsWindows(options)
    }
    return []
  })

  ipcMain.handle('get-running-apps-count', async () => {
    if (process.platform === 'win32') {
      return await getRunningAppsCount()
    }
    return 0
  })

  ipcMain.handle('get-recent-apps', async () => {
    if (process.platform === 'win32') {
      return await getRecentAppsWindows()
    }
    return []
  })

  ipcMain.handle('launch-app', async (event, appPath: string) => {
    return await launchApp(appPath)
  })

  ipcMain.handle('exec-command', async (event, command: string) => {
    try {
      const { stdout, stderr } = await execAsync(command)
      return { stdout, stderr }
    } catch (error) {
      const err = error as Error
      return { stdout: '', stderr: err.message }
    }
  })
}