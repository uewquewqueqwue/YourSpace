import { ref } from 'vue'
import { useAppsStore } from './apps'
import type { User } from '@/types/user'
import type { AuthStore } from "@/types/store"

const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const showLoginModal = ref(false)

const saveUserToStorage = (userData: User | null) => {
  if (userData) {
    localStorage.setItem('user', JSON.stringify(userData))
  } else {
    localStorage.removeItem('user')
  }
}

export function useAuth(): AuthStore {
  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { user: userData, token } = await window.electronAPI.db.login(email, password)

      localStorage.setItem('token', token)
      user.value = userData
      saveUserToStorage(userData)
      
      const appsStore = useAppsStore()
      await appsStore.fetchApps()
      await appsStore.forceSync(token)

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
    } finally {
      loading.value = false
    }
  }

  const register = async (name: string, email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { user: userData, token } = await window.electronAPI.db.register(name, email, password)

      localStorage.setItem('token', token)
      user.value = userData
      saveUserToStorage(userData)
      
      const appsStore = useAppsStore()
      await appsStore.fetchApps()
      await appsStore.forceSync(token)

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed'
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await window.electronAPI.db.logout(token)
      } catch (err) {
        console.error('Logout error:', err)
      }
    }

    const appsStore = useAppsStore()
    appsStore.logout()
    
    user.value = null
    saveUserToStorage(null)
    localStorage.removeItem('token')
    showLoginModal.value = false
    error.value = null
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        user.value = JSON.parse(savedUser)
      }
      return
    }

    try {
      const userData = await window.electronAPI.db.getMe(token)
      user.value = userData
      saveUserToStorage(userData)
      
      const appsStore = useAppsStore()
      await appsStore.fetchApps()

    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      user.value = null
    }
  }

  const updateProfile = async (name: string, avatar: string) => {
    const token = localStorage.getItem('token')
    if (!token) throw new Error('Not authenticated')

    try {
      const updatedUser = await window.electronAPI.db.updateProfile(token, name, avatar)
      user.value = updatedUser
      saveUserToStorage(updatedUser)
      return updatedUser
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update profile'
      throw err
    }
  }

  const openLogin = () => {
    showLoginModal.value = true
  }

  const closeLogin = () => {
    showLoginModal.value = false
    error.value = null
  }

  return {
    user,
    loading,
    error,
    showLoginModal,
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
    openLogin,
    closeLogin
  }
}