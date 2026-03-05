import { ref } from 'vue'
import { useAppsStore } from './apps'
import type { User, AuthStore } from '@/types/user'

const API_URL = 'http://localhost:3000'

const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const showLoginModal = ref(false)

export function useAuth(): AuthStore {
  const login = async (email: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      localStorage.setItem('token', data.token)
      user.value = data.user
      
      const appsStore = useAppsStore()
      await appsStore.fetchApps()
      await appsStore.forceSync()
      await appsStore.fetchApps()

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
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      localStorage.setItem('token', data.token)
      user.value = data.user
      
      const appsStore = useAppsStore()
      await appsStore.fetchApps()
      await appsStore.forceSync()
      await appsStore.fetchApps()

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed'
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    const appsStore = useAppsStore()
    await appsStore.forceSync()
    user.value = null
    localStorage.removeItem('token')
    showLoginModal.value = false
    error.value = null
  }

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.status === 401 || res.status === 404) {
        localStorage.removeItem('token')
        user.value = null
        return
      }

      const userData = await res.json()
      user.value = userData
      
      const appsStore = useAppsStore()
      await appsStore.fetchApps()

    } catch {
      localStorage.removeItem('token')
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
    openLogin,
    closeLogin
  }
}