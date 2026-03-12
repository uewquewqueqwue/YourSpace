import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/user'
import { useAppsStore } from './apps.pinia'
import { useTodoStore } from './todo.pinia'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const showLoginModal = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value)
  const token = computed(() => localStorage.getItem('token'))

  // Actions
  const saveUserToStorage = (userData: User | null) => {
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
  }

  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { user: userData, token: authToken } = await window.electronAPI.db.login(email, password)

      localStorage.setItem('token', authToken)
      user.value = userData
      saveUserToStorage(userData)

      // Fetch data from other stores
      const appsStore = useAppsStore()
      const todoStore = useTodoStore()
      
      await Promise.all([
        appsStore.fetchApps(),
        todoStore.fetchTodos()
      ])
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const register = async (name: string, email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const { user: userData, token: authToken } = await window.electronAPI.db.register(name, email, password)

      localStorage.setItem('token', authToken)
      user.value = userData
      saveUserToStorage(userData)

      // Fetch data from other stores
      const appsStore = useAppsStore()
      const todoStore = useTodoStore()
      
      await Promise.all([
        appsStore.fetchApps(),
        todoStore.fetchTodos()
      ])
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    const authToken = token.value
    if (authToken) {
      try {
        await window.electronAPI.db.logout(authToken)
      } catch (err) {
        console.error('Logout error:', err)
      }
    }

    // Clear other stores
    const appsStore = useAppsStore()
    const todoStore = useTodoStore()
    
    appsStore.logout()
    todoStore.logout()

    user.value = null
    saveUserToStorage(null)
    localStorage.removeItem('token')
    showLoginModal.value = false
    error.value = null
  }

  const checkAuth = async () => {
    const authToken = token.value
    if (!authToken) {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          user.value = JSON.parse(savedUser)
        } catch {
          localStorage.removeItem('user')
        }
      }
      return
    }

    try {
      const userData = await window.electronAPI.db.getMe(authToken)
      user.value = userData
      saveUserToStorage(userData)

      // Fetch data from other stores
      const appsStore = useAppsStore()
      const todoStore = useTodoStore()
      
      await Promise.all([
        appsStore.fetchApps(),
        todoStore.fetchTodos()
      ])
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      user.value = null
    }
  }

  const updateProfile = async (updates: { name?: string; avatar?: string }) => {
    const authToken = token.value
    if (!authToken) throw new Error('Not authenticated')

    try {
      const updatedUser = await window.electronAPI.db.updateProfile(authToken, updates)
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
    // State
    user,
    loading,
    error,
    showLoginModal,
    // Getters
    isAuthenticated,
    token,
    // Actions
    login,
    register,
    logout,
    checkAuth,
    updateProfile,
    openLogin,
    closeLogin
  }
})
