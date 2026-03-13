import { ipcMain } from 'electron'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import logger from '../utils/logger'

const execAsync = promisify(exec)

/**
 * System IPC Handlers
 * 
 * Exposes system information to the frontend via Electron IPC
 * Uses Node.js built-in 'os' module for lightweight system stats
 */

// Track previous CPU usage for calculating percentage
let previousCpuUsage = { idle: 0, total: 0 }

function getCpuUsage(): number {
  const cpus = os.cpus()
  
  let idle = 0
  let total = 0
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      total += cpu.times[type as keyof typeof cpu.times]
    }
    idle += cpu.times.idle
  })
  
  const idleDiff = idle - previousCpuUsage.idle
  const totalDiff = total - previousCpuUsage.total
  
  previousCpuUsage = { idle, total }
  
  if (totalDiff === 0) return 0
  
  const usage = 100 - (100 * idleDiff / totalDiff)
  return Math.max(0, Math.min(100, usage))
}

async function getDiskInfo() {
  try {
    if (os.platform() === 'win32') {
      // Windows: use wmic to get disk info
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption')
      const lines = stdout.trim().split('\n').slice(1) // Skip header
      
      const disks = lines
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const parts = line.split(/\s+/)
          if (parts.length >= 3) {
            const caption = parts[0]
            const freeSpace = parseInt(parts[1]) || 0
            const size = parseInt(parts[2]) || 0
            return {
              mount: caption,
              total: size,
              free: freeSpace,
              used: size - freeSpace,
              usagePercent: size > 0 ? ((size - freeSpace) / size) * 100 : 0
            }
          }
          return null
        })
        .filter(disk => disk !== null && disk.total > 0)
      
      return disks
    } else {
      // For non-Windows, return empty array (not supported)
      return []
    }
  } catch (error) {
    logger.error('Failed to get disk info:', error)
    return []
  }
}

// Track previous network stats for calculating speed
let previousNetworkStats = { bytesReceived: 0, bytesSent: 0, timestamp: Date.now() }

async function getNetworkStats() {
  try {
    if (os.platform() === 'win32') {
      // Windows: use netstat to get network stats
      const { stdout } = await execAsync('netstat -e')
      const lines = stdout.split('\n')
      
      let bytesReceived = 0
      let bytesSent = 0
      
      // Parse netstat output
      for (const line of lines) {
        if (line.includes('Bytes')) {
          const parts = line.split(/\s+/).filter(p => p.length > 0)
          if (parts.length >= 3) {
            bytesReceived = parseInt(parts[1]) || 0
            bytesSent = parseInt(parts[2]) || 0
            break
          }
        }
      }
      
      // Calculate speed (bytes per second)
      const now = Date.now()
      const timeDiff = (now - previousNetworkStats.timestamp) / 1000 // seconds
      
      const rxSpeed = timeDiff > 0 ? (bytesReceived - previousNetworkStats.bytesReceived) / timeDiff : 0
      const txSpeed = timeDiff > 0 ? (bytesSent - previousNetworkStats.bytesSent) / timeDiff : 0
      
      // Update previous stats
      previousNetworkStats = { bytesReceived, bytesSent, timestamp: now }
      
      return {
        rx: Math.max(0, rxSpeed),
        tx: Math.max(0, txSpeed)
      }
    } else {
      return { rx: 0, tx: 0 }
    }
  } catch (error) {
    logger.error('Failed to get network stats:', error)
    return { rx: 0, tx: 0 }
  }
}

export function setupSystemHandlers() {
  /**
   * Get current system stats (CPU, memory, disk, network)
   */
  ipcMain.handle('system:getStats', async () => {
    try {
      // CPU stats
      const cpuUsage = getCpuUsage()
      const cpus = os.cpus()
      
      // Memory stats
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memUsagePercent = (usedMem / totalMem) * 100
      
      // OS info
      const platform = os.platform()
      const release = os.release()
      const arch = os.arch()
      const hostname = os.hostname()
      const uptime = os.uptime()
      
      // Disk stats - get real disk info for Windows
      const disks = await getDiskInfo()
      const primaryDisk = disks[0] || {
        total: totalMem * 10,
        used: usedMem * 5,
        free: totalMem * 5,
        usagePercent: 50,
        mount: '/'
      }
      
      // Network stats - get real network info for Windows
      const networkStats = await getNetworkStats()
      
      return {
        success: true,
        stats: {
          cpu: {
            usage: Math.round(cpuUsage * 10) / 10,
            cores: cpus.length
          },
          memory: {
            total: totalMem,
            used: usedMem,
            free: freeMem,
            usagePercent: Math.round(memUsagePercent * 10) / 10
          },
          disk: {
            total: primaryDisk.total,
            used: primaryDisk.used,
            free: primaryDisk.free,
            usagePercent: Math.round(primaryDisk.usagePercent * 10) / 10,
            mount: primaryDisk.mount
          },
          disks: disks.map(disk => ({
            total: disk.total,
            used: disk.used,
            free: disk.free,
            usagePercent: Math.round(disk.usagePercent * 10) / 10,
            mount: disk.mount
          })),
          network: {
            rx: Math.round(networkStats.rx),
            tx: Math.round(networkStats.tx)
          },
          os: {
            platform,
            distro: platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux',
            release,
            arch,
            hostname
          },
          uptime
        }
      }
    } catch (error) {
      logger.error('system:getStats failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get system stats'
      }
    }
  })

  /**
   * Get detailed CPU information
   */
  ipcMain.handle('system:getCpuInfo', async () => {
    try {
      const cpus = os.cpus()
      const cpuUsage = getCpuUsage()
      
      return {
        success: true,
        cpu: {
          manufacturer: 'Unknown',
          brand: cpus[0]?.model || 'Unknown',
          speed: cpus[0]?.speed || 0,
          cores: cpus.length,
          physicalCores: cpus.length,
          processors: 1,
          currentLoad: cpuUsage,
          cpus: cpus.map(() => ({
            load: cpuUsage
          }))
        }
      }
    } catch (error) {
      logger.error('system:getCpuInfo failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get CPU info'
      }
    }
  })

  /**
   * Get process list - not available in os module
   */
  ipcMain.handle('system:getProcesses', async () => {
    return {
      success: false,
      error: 'Process list not available with lightweight system stats'
    }
  })

  logger.info('System IPC handlers registered (lightweight mode)')
}
