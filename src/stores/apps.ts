import { ref } from 'vue'
import { useAuth } from './auth'
import type {
  UserAppWithDisplay,
  CreateAppInput,
  AppSession
} from '@/types/apps'
import type { AppsStore } from '@/types'
import { generateColor } from '@/utils/generateColor'
import { log } from '@/log/logger'

const apps = ref<UserAppWithDisplay[]>([])
const quickApps = ref<UserAppWithDisplay[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pendingChanges = ref(false)

const STORAGE_KEY = 'apps_data'
const QUICK_KEY = 'quick_apps'

let monitoringInterval: NodeJS.Timeout | null = null
let syncInterval: NodeJS.Timeout | null = null

const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      apps.value = parsed.map((app: any) => ({
        ...app,
        createdAt: new Date(app.createdAt),
        updatedAt: new Date(app.updatedAt),
        lastUsed: app.lastUsed ? new Date(app.lastUsed) : null,
        catalog: {
          ...app.catalog,
          createdAt: new Date(app.catalog.createdAt),
          updatedAt: new Date(app.catalog.updatedAt)
        },
        isActive: app.isActive || false,
        currentSession: app.currentSession ? {
          ...app.currentSession,
          startTime: new Date(app.currentSession.startTime)
        } : null
      }))
    }
  } catch (e) {
    console.error('Failed to load from storage:', e)
  }
}

const saveToStorage = () => {
  try {
    const appsToSave = apps.value.map(app => ({
      ...app,
      catalog: {
        ...app.catalog,
        icon: undefined
      }
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appsToSave))
    pendingChanges.value = true
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
    const { stdout } = await window.electronAPI.execCommand(
      `tasklist /fi "IMAGENAME eq ${exeName}" /fo csv /nh`
    )
    return stdout.includes(exeName) && !stdout.includes('Not Found')
  } catch {
    return false
  }
}

const checkAppStatus = async (app: UserAppWithDisplay) => {
  const exeName = app.path.split('\\').pop() || ''
  const isRunning = await isProcessRunning(exeName)
  const now = Date.now()

  if (isRunning && !app.isActive) {
    log('info', `${app.displayName} started`)
    
    app.isActive = true
    app.lastUsed = new Date()
    
    const session: AppSession = {
      id: crypto.randomUUID(),
      userAppId: app.id,
      userId: app.userId,
      startTime: new Date(),
      endTime: null,
      duration: null,
      createdAt: new Date()
    }
    
    app.currentSession = session
    saveToStorage()
  }
  
  else if (!isRunning && app.isActive && app.currentSession) {
    const duration = Math.floor((now - app.currentSession.startTime.getTime()) / 60000)
    
    if (duration > 0) {
      app.totalMinutes += duration
    }
    
    app.isActive = false
    app.currentSession.endTime = new Date()
    app.currentSession.duration = duration
    app.currentSession = null
    
    saveToStorage()
  }
  
  else if (isRunning && app.isActive && app.currentSession) {
    const sessionStart = app.currentSession.startTime.getTime()
    const elapsed = Math.floor((now - sessionStart) / 60000)
    
    if (elapsed > (app.currentSession.duration || 0)) {
      app.currentSession.duration = elapsed
      saveToStorage()
    }
  }
}

const startMonitoring = () => {
  if (monitoringInterval) return

  const checkAllApps = async () => {
    for (const app of apps.value) {
      await checkAppStatus(app)
    }
  }

  monitoringInterval = setInterval(checkAllApps, 30000)
  setTimeout(checkAllApps, 1000)
}

const syncToServer = async (token: string) => {
  if (!token) return

  try {
    for (const app of apps.value) {
      if (!app.id.startsWith('local-')) {
        await window.electronAPI.db.updateApp(token, app.id, {
          totalMinutes: app.totalMinutes,
          lastUsed: app.lastUsed || undefined
        })
      } else {
        const newApp = await window.electronAPI.db.createApp(token, {
          path: app.path,
          catalogName: app.displayName,
          customName: app.customName || undefined,
          customColor: app.customColor || undefined,
          totalMinutes: app.totalMinutes
        })
        
        app.id = newApp.id
        app.catalogId = newApp.catalogId
        app.catalog = newApp.catalog
        saveToStorage()
      }
    }
  } catch (err) {
    console.error('Sync failed:', err)
  }
}

const syncFromServer = async (token: string) => {
  if (!token) return

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
        localApp.displayName = serverApp.displayName
        localApp.displayColor = serverApp.displayColor
        localApp.catalog = serverApp.catalog
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
    const auth = useAuth()
    const token = localStorage.getItem('token')
    if (auth.user.value && token && pendingChanges.value) {
      await syncToServer(token)
    }
  }, 5 * 60 * 1000)
}

const stopPeriodicSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

loadFromStorage()
loadQuickFromStorage()

export function initializeAppsStore() {
  startMonitoring()
  startPeriodicSync()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', async () => {
    const auth = useAuth()
    const token = localStorage.getItem('token')
    if (auth.user.value && token && pendingChanges.value) {
      await syncToServer(token)
    }
  })
}

export function useAppsStore(): AppsStore {
  const auth = useAuth()

  const fetchApps = async (token?: string) => {
    const actualToken = token || localStorage.getItem('token')
    if (!actualToken || !auth.user.value) return
    
    loading.value = true
    error.value = null
    try {
      await syncFromServer(actualToken)
    } catch (err) {
      error.value = 'Failed to fetch apps'
    } finally {
      loading.value = false
    }
  }

  const addApp = async (token: string, input: CreateAppInput): Promise<UserAppWithDisplay | null> => {
    if (apps.value.some(a => a.path === input.path)) {
      error.value = 'App already added'
      return null
    }

    const newApp: UserAppWithDisplay = {
      id: 'local-' + crypto.randomUUID(),
      userId: auth.user.value?.id || 'local',
      catalogId: 'temp',
      path: input.path,
      customName: input.customName || null,
      customColor: input.customColor || null,
      totalMinutes: 0,
      lastUsed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      catalog: {
        id: 'temp',
        name: input.catalogName,
        displayName: input.catalogName,
        icon: null,
        color: generateColor(input.catalogName),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      displayName: input.customName || input.catalogName,
      displayColor: input.customColor || generateColor(input.catalogName),
      isActive: false,
      currentSession: null
    }

    apps.value = [...apps.value, newApp]
    saveToStorage()
    setTimeout(() => checkAppStatus(newApp), 500)

    if (auth.user.value && token) {
      try {
        const serverApp = await window.electronAPI.db.createApp(token, {
          path: newApp.path,
          catalogName: newApp.displayName,
          customName: newApp.customName || undefined,
          customColor: newApp.customColor || undefined
        })
        
        newApp.id = serverApp.id
        newApp.catalogId = serverApp.catalogId
        newApp.catalog = serverApp.catalog
        newApp.displayName = serverApp.displayName
        newApp.displayColor = serverApp.displayColor
        saveToStorage()
      } catch (err) {
        console.error('Failed to sync new app:', err)
      }
    }
    
    return newApp
  }

  const removeApp = async (token: string, id: string): Promise<boolean> => {
    const app = apps.value.find(a => a.id === id)
    if (!app) return false

    apps.value = apps.value.filter(a => a.id !== id)
    quickApps.value = quickApps.value.filter(a => a.id !== id)
    saveToStorage()
    saveQuickToStorage()
    
    if (auth.user.value && token && !id.startsWith('local-')) {
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
      const result = await window.electronAPI.launchApp(path)
      return result.success
    } catch {
      return false
    }
  }

  const forceSync = async (token: string) => {
    if (auth.user.value && token) {
      await syncToServer(token)
    }
  }

  const addToQuick = (id: string): boolean => {
    const app = apps.value.find(a => a.id === id)
    if (!app || quickApps.value.find(a => a.id === id)) return false
    quickApps.value = [...quickApps.value, app]
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
    
    return apps.value.reduce((total, app) => {
      if (app.lastUsed && app.lastUsed >= today) {
        return total + app.totalMinutes
      }
      return total
    }, 0)
  }

  const reset = () => {
    apps.value = []
    quickApps.value = []
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(QUICK_KEY)
  }

  const logout = () => {
    // Очищаем, но не удаляем локальные данные
    // TODO: решить что делать с данными при логауте
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