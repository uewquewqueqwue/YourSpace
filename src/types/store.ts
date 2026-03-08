import { Ref } from 'vue'
import type { UserAppWithDisplay } from './apps'
import type { CreateAppInput } from './apps'
import type { User } from './user'

export interface AppsStore {

  apps: Readonly<Ref<UserAppWithDisplay[]>>
  quickApps: Readonly<Ref<UserAppWithDisplay[]>>
  loading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>


  fetchApps: () => Promise<void>
  addApp: (input: CreateAppInput) => Promise<UserAppWithDisplay | null>
  removeApp: (id: string) => Promise<boolean>
  launchApp: (path: string) => Promise<boolean>
  forceSync: (token?: string) => Promise<void>


  addToQuick: (id: string) => boolean
  removeFromQuick: (id: string) => void
  isInQuick: (id: string) => boolean


  getAppById: (id: string) => UserAppWithDisplay | undefined
  getActiveApps: () => UserAppWithDisplay[]
  getTotalTimeToday: () => number


  reset: () => void
  logout: () => void
  saveToStorage: () => void
  startPeriodicSync: () => void
  stopPeriodicSync: () => void
}

export interface AuthStore {
  user: Ref<User | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  showLoginModal: Ref<boolean>
  
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  updateProfile: (name: string, avatar: string) => Promise<User>
  openLogin: () => void
  closeLogin: () => void
}