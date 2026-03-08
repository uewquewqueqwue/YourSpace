import { ref } from 'vue'
import type { UserAppWithDisplay, CreateAppInput, AppSession } from '@/types/apps'
import type { AppsStore } from '@/types'
import { generateColor } from '@/utils/generateColor'

const apps = ref<UserAppWithDisplay[]>([])
const quickApps = ref<UserAppWithDisplay[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pendingChanges = ref(false)
const catalogs = ref<any[]>([])

const STORAGE_KEY = 'apps_data'
const QUICK_KEY = 'quick_apps'

let monitoringInterval: NodeJS.Timeout | null = null
let syncInterval: NodeJS.Timeout | null = null

const getToken = (): string | null => {
  return localStorage.getItem('token')
}

const isAuthenticated = (): boolean => {
  return !!getToken() && !!localStorage.getItem('user')
}

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      apps.value = JSON.parse(saved, (key, value) => {
        if (key === 'createdAt' || key === 'updatedAt' || key === 'lastUsed' || key === 'startTime' || key === 'endTime') {
          return value ? new Date(value) : null
        }
        return value
      })
    }
  } catch (e) {
    console.error('Failed to load from storage:', e)
  }
}

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps.value))
    if (isAuthenticated()) {
      pendingChanges.value = true
    }
  } catch (e) {
    console.error('Failed to save to storage:', e)
  }
}

const loadQuickFromStorage = () => {
  try {
    const saved = localStorage.getItem(QUICK_KEY)
    if (saved) {
      const ids = JSON.parse(saved)
      quickApps.value = apps.value.filter(app => ids.includes(app.id))
    }
  } catch (e) {
    console.error('Failed to load quick apps:', e)
  }
}

const saveQuickToStorage = () => {
  try {
    const ids = quickApps.value.map(app => app.id)
    localStorage.setItem(QUICK_KEY, JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save quick apps:', e)
  }
}

const isProcessRunning = async (exeName: string): Promise<boolean> => {
  if (!exeName) return false
  try {
    const { stdout } = await window.electronAPI.apps.execCommand(
      `tasklist /fi "IMAGENAME eq ${exeName}" /fo csv /nh`
    )
    return stdout.includes(exeName) && !stdout.includes('Not Found')
  } catch {
    return false
  }
}

const checkAppStatus = async (app: UserAppWithDisplay) => {
  if (!app) return
  
  if (!app.path) {
    app.hasInvalidPath = true
    return
  }
  
  const exeName = app.path.split('\\').pop() || ''
  const isRunning = await isProcessRunning(exeName)
  const now = Date.now()

  if (isRunning && !app.isActive) {
    app.isActive = true
    app.lastUsed = new Date()
    app.currentSession = {
      id: crypto.randomUUID(),
      userAppId: app.id,
      userId: app.userId,
      startTime: new Date(),
      endTime: null,
      duration: null,
      createdAt: new Date()
    }
    saveToStorage()
  } else if (!isRunning && app.isActive && app.currentSession) {
    const duration = Math.floor((now - app.currentSession.startTime.getTime()) / 60000)
    if (duration > 0) {
      app.totalMinutes += duration
    }
    app.isActive = false
    app.currentSession.endTime = new Date()
    app.currentSession.duration = duration
    app.currentSession = null
    saveToStorage()
  } else if (isRunning && app.isActive && app.currentSession) {
    const elapsed = Math.floor((now - app.currentSession.startTime.getTime()) / 60000)
    if (elapsed > (app.currentSession.duration || 0)) {
      app.currentSession.duration = elapsed
      saveToStorage()
    }
  }
}

const startMonitoring = () => {
  if (monitoringInterval) return
  monitoringInterval = setInterval(async () => {
    for (const app of apps.value) {
      if (app) {
        await checkAppStatus(app)
      }
    }
  }, 30000)
  setTimeout(() => checkAppStatus(apps.value[0]), 1000)
}

const syncToServer = async (token: string) => {
  if (!token || !isAuthenticated()) return
  try {
    for (const app of apps.value) {
      if (!app.id.startsWith('local-')) {
        await window.electronAPI.db.updateApp(token, app.id, {
          totalMinutes: app.totalMinutes,
          lastUsed: app.lastUsed || undefined
        })
      } else {
        const serverApp = await window.electronAPI.db.createApp(token, {
          path: app.path,
          catalogName: app.displayName,
          customName: app.customName || undefined,
          customColor: app.customColor || undefined,
          totalMinutes: app.totalMinutes
        })
        app.id = serverApp.id
        app.catalogId = serverApp.catalogId
        app.catalog = serverApp.catalog
        saveToStorage()
      }
    }
    pendingChanges.value = false
  } catch (err) {
    console.error('Sync failed:', err)
  }
}

const fetchCatalogs = async () => {
  try {
    catalogs.value = await window.electronAPI.db.getCatalogs()
  } catch (err) {
    console.error('Failed to fetch catalogs:', err)
  }
}

const syncFromServer = async (token: string) => {
  if (!token || !isAuthenticated()) return
  try {
    const serverApps = await window.electronAPI.db.getApps(token)
    
    for (const serverApp of serverApps) {
      const localApp = apps.value.find(a => a.path === serverApp.path)
      
      if (!localApp) {
        apps.value.push({
          ...serverApp,
          isActive: false,
          currentSession: null
        })
      } else {
        Object.assign(localApp, serverApp)
        localApp.isActive = localApp.isActive || false
        localApp.currentSession = localApp.currentSession || null
        if (localApp.id.startsWith('local-')) {
          localApp.id = serverApp.id
        }
      }
    }
    saveToStorage()
  } catch (err) {
    console.error('Sync from server failed:', err)
  }
}

const startPeriodicSync = () => {
  if (syncInterval) return
  syncInterval = setInterval(async () => {
    const token = getToken()
    if (token && isAuthenticated() && pendingChanges.value) {
      await syncToServer(token)
    }
  }, 300000)
}

const stopPeriodicSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

loadFromStorage()
loadQuickFromStorage()

export async function initializeAppsStore() {
  await fetchCatalogs()
  
  for (const app of apps.value) {
    const publicCatalog = catalogs.value.find(c => c.name === app.displayName)
    
    if (publicCatalog) {
      app.catalog = publicCatalog
      app.catalogId = publicCatalog.id
      app.displayColor = publicCatalog.color || app.displayColor
    } else {
      try {
        const newCatalog = await window.electronAPI.db.createCatalog({
          name: app.displayName,
          displayName: app.displayName,
          color: generateColor(app.displayName)
        })
        catalogs.value.push(newCatalog)
        app.catalog = newCatalog
        app.catalogId = newCatalog.id
      } catch (err) {
        console.error('Failed to create catalog for existing app:', err)
      }
    }
  }
  
  saveToStorage()
  startMonitoring()
  
  const token = getToken()
  if (token && isAuthenticated()) {
    await syncFromServer(token)
    startPeriodicSync()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', async () => {
    const token = getToken()
    if (token && isAuthenticated() && pendingChanges.value) {
      await syncToServer(token)
    }
  })
}

export function useAppsStore(): AppsStore {
  const fetchApps = async () => {
    const token = getToken()
    if (token && isAuthenticated()) {
      loading.value = true
      error.value = null
      try {
        await syncFromServer(token)
      } catch {
        error.value = 'Failed to fetch apps'
      } finally {
        loading.value = false
      }
    }
  }

  const addApp = async (input: CreateAppInput): Promise<UserAppWithDisplay | null> => {
    if (apps.value.some(a => a.path === input.path)) {
      error.value = 'App already added'
      return null
    }

    const token = getToken()
    const isAuth = token && isAuthenticated()
    
    let catalog = catalogs.value.find(c => c.name === input.catalogName)
    
    if (!catalog) {
      try {
        catalog = await window.electronAPI.db.createCatalog({
          name: input.catalogName,
          displayName: input.catalogName,
          color: generateColor(input.catalogName)
        })
        catalogs.value.push(catalog)
      } catch (err) {
        catalog = {
          id: 'local-' + crypto.randomUUID(),
          name: input.catalogName,
          displayName: input.catalogName,
          color: generateColor(input.catalogName)
        }
      }
    }

    const newApp: UserAppWithDisplay = {
      id: isAuth ? 'local-' + crypto.randomUUID() : 'local-' + crypto.randomUUID(),
      userId: isAuth ? 'pending' : 'local',
      catalogId: catalog.id,
      path: input.path,
      customName: input.customName || null,
      customColor: input.customColor || null,
      totalMinutes: 0,
      lastUsed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      catalog,
      displayName: input.customName || catalog.displayName || catalog.name,
      displayColor: input.customColor || catalog.color,
      isActive: false,
      currentSession: null,
      hasInvalidPath: false
    }

    apps.value.push(newApp)
    saveToStorage()
    checkAppStatus(newApp)

    if (isAuth) {
      try {
        const serverApp = await window.electronAPI.db.createApp(token, {
          path: newApp.path,
          catalogName: newApp.displayName,
          customName: newApp.customName || undefined,
          customColor: newApp.customColor || undefined
        })
        Object.assign(newApp, serverApp)
        newApp.isActive = false
        newApp.currentSession = null
        saveToStorage()
      } catch (err) {
        console.error('Failed to sync new app:', err)
      }
    }

    return newApp
  }

  const removeApp = async (id: string): Promise<boolean> => {
    const index = apps.value.findIndex(a => a.id === id)
    if (index === -1) return false
    
    const [app] = apps.value.splice(index, 1)
    quickApps.value = quickApps.value.filter(a => a.id !== id)
    saveToStorage()
    saveQuickToStorage()

    const token = getToken()
    if (token && isAuthenticated() && !id.startsWith('local-')) {
      try {
        await window.electronAPI.db.deleteApp(token, id)
      } catch (err) {
        console.error('Failed to delete from server:', err)
      }
    }

    return true
  }

  const launchApp = async (path: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI.apps.launchApp(path)
      return result.success
    } catch {
      return false
    }
  }

  const forceSync = async (token?: string) => {
    const t = token || getToken()
    if (t && isAuthenticated()) {
      await syncToServer(t)
    }
  }

  const addToQuick = (id: string): boolean => {
    const app = apps.value.find(a => a.id === id)
    if (!app || quickApps.value.includes(app)) return false
    quickApps.value.push(app)
    saveQuickToStorage()
    return true
  }

  const removeFromQuick = (id: string): void => {
    quickApps.value = quickApps.value.filter(a => a.id !== id)
    saveQuickToStorage()
  }

  const isInQuick = (id: string): boolean => {
    return quickApps.value.some(a => a.id === id)
  }

  const getAppById = (id: string) => {
    return apps.value.find(a => a.id === id)
  }

  const getActiveApps = () => {
    return apps.value.filter(a => a.isActive)
  }

  const getTotalTimeToday = (): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return apps.value.reduce((total, app) => 
      total + (app.lastUsed && app.lastUsed >= today ? app.totalMinutes : 0), 0)
  }

  const reset = () => {
    apps.value = []
    quickApps.value = []
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(QUICK_KEY)
  }

  const logout = () => {
    pendingChanges.value = false
    stopPeriodicSync()
  }

  return {
    apps,
    quickApps,
    loading,
    error,
    fetchApps,
    addApp,
    removeApp,
    launchApp,
    forceSync,
    addToQuick,
    removeFromQuick,
    isInQuick,
    getAppById,
    getActiveApps,
    getTotalTimeToday,
    reset,
    logout,
    saveToStorage,
    startPeriodicSync,
    stopPeriodicSync
  }
}