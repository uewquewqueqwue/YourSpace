import { ipcMain } from 'electron'
import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import { isSystemProcess } from '../utils/processHelpers'
import type { ProcessInfo, LaunchResult, GetAppsOptions } from '@/types/apps'
import { writeDebug } from '../preload-env'

const execAsync = promisify(exec)


let processesCache: ProcessInfo[] = []

async function getUniqueProcesses(): Promise<ProcessInfo[]> {
  writeDebug("get Apps called")
  try {
    const psCommand = `
      Get-Process | 
      Where-Object { $_.Path } |
      Select-Object Name, Path, Id |
      ConvertTo-Json
    `
    
    const { stdout } = await execAsync(
      `powershell -Command "${psCommand.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
    )
    
    if (!stdout || stdout.trim() === '' || stdout.trim() === 'null') {
      processesCache = []
      return []
    }
    
    const processes = JSON.parse(stdout)
    const processesArray = Array.isArray(processes) ? processes : [processes]
    
    const uniqueMap = new Map<string, ProcessInfo>()
    
    processesArray.forEach((p: any) => {
      const displayName = p.Name
      
      if (!uniqueMap.has(displayName)) {
        uniqueMap.set(displayName, {
          displayName: displayName,
          name: p.Name + '.exe',
          path: p.Path || '',
          pid: p.Id.toString(),
          rawPath: p.Path || ''
        })
      }
    })
    
    const uniqueProcesses = Array.from(uniqueMap.values())
    processesCache = uniqueProcesses.filter(p => !isSystemProcess(p))
    return processesCache
    
  } catch (error) {
    console.error('Error with Get-Process:', error)
    writeDebug(`Error with Get-Process: ${error}`)
    processesCache = []
    return []
  }
}

async function getRunningAppsCount(): Promise<number> {
  if (processesCache.length === 0) {
    await getUniqueProcesses()
  }
  return processesCache.length
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