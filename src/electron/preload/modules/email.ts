import { ipcRenderer } from 'electron'
import type { EmailAPI } from '@/types/electron'

export function setupEmailAPI(): EmailAPI {
  return {
    accounts: {
      connect: (token: string) => 
        ipcRenderer.invoke('email:accounts:connect', { token }),
      
      callback: (code: string, state: string) => 
        ipcRenderer.invoke('email:accounts:callback', { code, state }),
      
      list: (token: string) => 
        ipcRenderer.invoke('email:accounts:list', { token }),
      
      disconnect: (token: string, accountId: string) => 
        ipcRenderer.invoke('email:accounts:disconnect', { token, accountId })
    },
    
    sync: {
      trigger: (token: string) => 
        ipcRenderer.invoke('email:sync:trigger', { token })
    },
    
    list: (token: string, options?: { accountId?: string; isRead?: boolean; limit?: number; offset?: number }) => 
      ipcRenderer.invoke('email:list', { token, ...options }),
    
    markRead: (token: string, emailId: string, isRead: boolean) => 
      ipcRenderer.invoke('email:markRead', { token, emailId, isRead }),
    
    search: (token: string, query: string, options?: { accountId?: string; limit?: number }) => 
      ipcRenderer.invoke('email:search', { token, query, ...options }),
    
    unreadCount: (token: string) => 
      ipcRenderer.invoke('email:unreadCount', { token })
  }
}
