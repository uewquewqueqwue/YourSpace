import { ipcRenderer } from 'electron'
import type { SystemAPI } from '@/types/electron'

export function setupSystemAPI(): SystemAPI {
  return {
    getStats: () => ipcRenderer.invoke('system:getStats'),
    getCpuInfo: () => ipcRenderer.invoke('system:getCpuInfo'),
    getProcesses: () => ipcRenderer.invoke('system:getProcesses')
  }
}
