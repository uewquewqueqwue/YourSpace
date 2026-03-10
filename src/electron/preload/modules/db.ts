import { ipcRenderer } from 'electron'

export function setupDBAPI() {
  return {
    login: (email: string, password: string) => 
      ipcRenderer.invoke('auth:login', { email, password }),
    register: (name: string, email: string, password: string) => 
      ipcRenderer.invoke('auth:register', { name, email, password }),
    logout: (token: string) => 
      ipcRenderer.invoke('auth:logout', token),
    getMe: (token: string) => 
      ipcRenderer.invoke('auth:me', token),
    updateProfile: (token: string, updates: any) => 
      ipcRenderer.invoke('auth:updateProfile', { token, ...updates }),

    getApps: (token: string) => 
      ipcRenderer.invoke('apps:getAll', token),
    createApp: (token: string, data: any) => 
      ipcRenderer.invoke('apps:create', { token, ...data }),
    updateApp: (token: string, id: string, data: any) => 
      ipcRenderer.invoke('apps:update', { token, id, ...data }),
    deleteApp: (token: string, id: string) => 
      ipcRenderer.invoke('apps:delete', { token, id }),

    getCatalogs: () => 
      ipcRenderer.invoke('catalogs:getAll'),
    createCatalog: (data: any) => 
      ipcRenderer.invoke('catalogs:create', { ...data }),

    getLatestVersion: () => 
      ipcRenderer.invoke('versions:getLatest'),
    getVersionPatches: (version: string) => 
      ipcRenderer.invoke('versions:getByVersion', version),
    createVersion: (version: string, patchNotes: any[]) => 
      ipcRenderer.invoke('versions:create', { version, patchNotes }),
    batchUpdateApps: (token: string, updates: any[]) => 
      ipcRenderer.invoke('apps:batchUpdate', { token, updates }),
  }
}