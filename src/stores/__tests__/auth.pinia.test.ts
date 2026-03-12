import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth.pinia'

// Mock window.electronAPI
const mockElectronAPI = {
  db: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    updateProfile: vi.fn()
  }
}

global.window = {
  electronAPI: mockElectronAPI
} as any

// Mock other stores
vi.mock('../apps.pinia', () => ({
  useAppsStore: vi.fn(() => ({
    fetchApps: vi.fn(),
    logout: vi.fn()
  }))
}))

vi.mock('../todo.pinia', () => ({
  useTodoStore: vi.fn(() => ({
    fetchTodos: vi.fn(),
    logout: vi.fn()
  }))
}))

describe('Auth Store (Pinia)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null
      }

      mockElectronAPI.db.login.mockResolvedValue({
        user: mockUser,
        token: 'test-token'
      })

      const store = useAuthStore()
      await store.login('test@example.com', 'password123')

      expect(store.user).toEqual(mockUser)
      expect(store.isAuthenticated).toBe(true)
      expect(localStorage.getItem('token')).toBe('test-token')
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser))
    })

    it('should handle login error', async () => {
      mockElectronAPI.db.login.mockRejectedValue(new Error('Invalid credentials'))

      const store = useAuthStore()
      
      await expect(
        store.login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials')

      expect(store.user).toBeNull()
      expect(store.error).toBe('Invalid credentials')
      expect(store.isAuthenticated).toBe(false)
    })

    it('should set loading state during login', async () => {
      mockElectronAPI.db.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          user: { id: '1', email: 'test@example.com', name: 'Test' },
          token: 'token'
        }), 100))
      )

      const store = useAuthStore()
      const loginPromise = store.login('test@example.com', 'password123')

      expect(store.loading).toBe(true)
      
      await loginPromise
      
      expect(store.loading).toBe(false)
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        name: 'New User',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=newuser@example.com'
      }

      mockElectronAPI.db.register.mockResolvedValue({
        user: mockUser,
        token: 'test-token'
      })

      const store = useAuthStore()
      await store.register('New User', 'newuser@example.com', 'password123')

      expect(store.user).toEqual(mockUser)
      expect(store.isAuthenticated).toBe(true)
      expect(localStorage.getItem('token')).toBe('test-token')
    })

    it('should handle registration error', async () => {
      mockElectronAPI.db.register.mockRejectedValue(new Error('User already exists'))

      const store = useAuthStore()
      
      await expect(
        store.register('Test', 'existing@example.com', 'password123')
      ).rejects.toThrow('User already exists')

      expect(store.error).toBe('User already exists')
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null
      }

      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify(mockUser))

      const store = useAuthStore()
      store.user = mockUser

      mockElectronAPI.db.logout.mockResolvedValue({ success: true })

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })

    it('should handle logout error gracefully', async () => {
      localStorage.setItem('token', 'test-token')
      
      const store = useAuthStore()
      mockElectronAPI.db.logout.mockRejectedValue(new Error('Network error'))

      await store.logout()

      // Should still clear local state even if server call fails
      expect(store.user).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('checkAuth', () => {
    it('should restore user from token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null
      }

      localStorage.setItem('token', 'test-token')
      mockElectronAPI.db.getMe.mockResolvedValue(mockUser)

      const store = useAuthStore()
      await store.checkAuth()

      expect(store.user).toEqual(mockUser)
      expect(store.isAuthenticated).toBe(true)
    })

    it('should restore user from localStorage if no token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null
      }

      localStorage.setItem('user', JSON.stringify(mockUser))

      const store = useAuthStore()
      await store.checkAuth()

      expect(store.user).toEqual(mockUser)
    })

    it('should clear invalid token', async () => {
      localStorage.setItem('token', 'invalid-token')
      mockElectronAPI.db.getMe.mockRejectedValue(new Error('Invalid token'))

      const store = useAuthStore()
      await store.checkAuth()

      expect(store.user).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Updated Name',
        avatar: 'https://example.com/avatar.png'
      }

      localStorage.setItem('token', 'test-token')
      mockElectronAPI.db.updateProfile.mockResolvedValue(updatedUser)

      const store = useAuthStore()
      const result = await store.updateProfile({
        name: 'Updated Name',
        avatar: 'https://example.com/avatar.png'
      })

      expect(result).toEqual(updatedUser)
      expect(store.user).toEqual(updatedUser)
      expect(localStorage.getItem('user')).toBe(JSON.stringify(updatedUser))
    })

    it('should throw error if not authenticated', async () => {
      const store = useAuthStore()

      await expect(
        store.updateProfile({ name: 'New Name' })
      ).rejects.toThrow('Not authenticated')
    })
  })

  describe('modal controls', () => {
    it('should open login modal', () => {
      const store = useAuthStore()
      store.openLogin()

      expect(store.showLoginModal).toBe(true)
    })

    it('should close login modal and clear error', () => {
      const store = useAuthStore()
      store.error = 'Some error'
      store.showLoginModal = true

      store.closeLogin()

      expect(store.showLoginModal).toBe(false)
      expect(store.error).toBeNull()
    })
  })
})
