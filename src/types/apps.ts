import { Ref } from 'vue'

export interface AppCatalog {
  id: string
  name: string
  displayName: string | null
  icon: string | null
  color: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AppSession {
  id: string
  userAppId: string
  userId: string
  startTime: Date
  endTime: Date | null
  duration: number | null
  createdAt: Date
}

export interface UserApp {
  id: string
  userId: string
  catalogId: string
  path: string
  customName: string | null
  customColor: string | null
  totalMinutes: number
  lastUsed: Date | null
  createdAt: Date
  updatedAt: Date
  catalog: AppCatalog
}

export interface UserAppWithDisplay extends UserApp {
  displayName: string
  displayColor: string
  isActive: boolean
  currentSession: AppSession | null
}

export interface CreateAppInput {
  path: string
  catalogName: string
  customName?: string
  customColor?: string
}

export interface AppsStore {
  apps: Ref<UserAppWithDisplay[]>
  quickApps: Ref<UserAppWithDisplay[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  
  fetchApps: () => Promise<void>
  addApp: (input: CreateAppInput) => Promise<UserAppWithDisplay | null>
  removeApp: (id: string) => Promise<boolean>
  launchApp: (path: string) => Promise<boolean>
  forceSync: () => Promise<void>
  
  addToQuick: (id: string) => boolean
  removeFromQuick: (id: string) => void
  isInQuick: (id: string) => boolean
  
  getAppById: (id: string) => UserAppWithDisplay | undefined
  getActiveApps: () => UserAppWithDisplay[]
  getTotalTimeToday: () => number
  
  saveToStorage: () => void
  reset: () => void
  logout: () => void
  startPeriodicSync: () => void
  stopPeriodicSync: () => void
}