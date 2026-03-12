import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppsStore } from '../apps.pinia'

const mockElectronAPI = {
  db: {
    getApps: vi.fn(),
    createApp: vi.fn(),
    updateApp: vi.fn(),
    deleteApp: vi.fn(),
    getCatalogs: vi.fn(),
    createCatalog: vi.fn()
  },
  apps: {
    execCommand: vi.fn(),
    launchApp: vi.fn()
  }
}

global.window = {
  electronAPI: mockElectronAPI,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
} as any

describe('Apps Store (Pinia)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('addApp', () => {
    it('should add app successfully', async () => {
      const mockCatalog = {
        id: 'cat1',
        name: 'TestApp',
        displayName: 'Test Application',
        color: '#FF0000',
        icon: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockElectronAPI.db.getCatalogs.mockResolvedValue([mockCatalog])
      mockElectronAPI.db.createCatalog.mockResolvedValue(mockCatalog)

      const store = useAppsStore()
      await store.initialize()

      const result = await store.addApp({
        path: 'C:\\Program Files\\TestApp.exe',
        customName: 'My Test App'
      })

      expect(result).toBeTruthy()
      expect(store.apps).toHaveLength(1)
      expect(store.apps[0].path).toBe('C:\\Program Files\\TestApp.exe')
    })
  })
})