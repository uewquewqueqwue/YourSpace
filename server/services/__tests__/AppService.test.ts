import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AppService } from '../AppService'
import { appRepository } from '../../repositories/AppRepository'
import { NotFoundError, ConflictError } from '../../utils/errors'

// Mock environment variables
process.env.DATABASE_URL = 'mock-database-url'

vi.mock('../../repositories/AppRepository')
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}))
vi.mock('../../prisma', () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback())
  }
}))

describe('AppService', () => {
  let appService: AppService

  beforeEach(() => {
    appService = new AppService()
    vi.clearAllMocks()
  })

  describe('getAllApps', () => {
    it('should return all apps for a user', async () => {
      const mockApps = [
        {
          id: '1',
          userId: 'user1',
          path: 'C:\\Program Files\\App1.exe',
          customName: null,
          customColor: null,
          totalMinutes: 120,
          lastUsed: new Date(),
          catalog: {
            id: 'cat1',
            name: 'App1',
            displayName: 'Application 1',
            icon: null,
            color: '#FF0000'
          }
        }
      ]

      vi.mocked(appRepository.findAllByUserId).mockResolvedValue(mockApps as any)

      const result = await appService.getAllApps('user1')

      expect(result).toEqual(mockApps)
      expect(appRepository.findAllByUserId).toHaveBeenCalledWith('user1')
    })
  })

  describe('getAppById', () => {
    it('should return app if found', async () => {
      const mockApp = {
        id: '1',
        userId: 'user1',
        path: 'C:\\Program Files\\App1.exe',
        catalog: { id: 'cat1', name: 'App1' }
      }

      vi.mocked(appRepository.findById).mockResolvedValue(mockApp as any)

      const result = await appService.getAppById('1', 'user1')

      expect(result).toEqual(mockApp)
    })

    it('should throw NotFoundError if app not found', async () => {
      vi.mocked(appRepository.findById).mockResolvedValue(null)

      await expect(
        appService.getAppById('nonexistent', 'user1')
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('createApp', () => {
    it('should create a new app successfully', async () => {
      const mockCatalog = {
        id: 'cat1',
        name: 'App1',
        displayName: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockApp = {
        id: '1',
        userId: 'user1',
        catalogId: 'cat1',
        path: 'C:\\Program Files\\App1.exe',
        customName: null,
        customColor: null,
        totalMinutes: 0,
        lastUsed: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        catalog: mockCatalog
      }

      vi.mocked(appRepository.findByPath).mockResolvedValue(null)
      vi.mocked(appRepository.findCatalogByName).mockResolvedValue(mockCatalog)
      vi.mocked(appRepository.create).mockResolvedValue(mockApp as any)

      const result = await appService.createApp('user1', {
        path: 'C:\\Program Files\\App1.exe',
        catalogName: 'App1'
      })

      expect(result).toEqual(mockApp)
    })

    it('should throw ConflictError if app already exists', async () => {
      const existingApp = {
        id: '1',
        userId: 'user1',
        path: 'C:\\Program Files\\App1.exe'
      }

      vi.mocked(appRepository.findByPath).mockResolvedValue(existingApp as any)

      await expect(
        appService.createApp('user1', {
          path: 'C:\\Program Files\\App1.exe',
          catalogName: 'App1'
        })
      ).rejects.toThrow(ConflictError)
    })

    it('should create catalog if it does not exist', async () => {
      const mockCatalog = {
        id: 'cat1',
        name: 'NewApp',
        displayName: null,
        icon: null,
        color: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockApp = {
        id: '1',
        userId: 'user1',
        catalogId: 'cat1',
        path: 'C:\\Program Files\\NewApp.exe',
        catalog: mockCatalog
      }

      vi.mocked(appRepository.findByPath).mockResolvedValue(null)
      vi.mocked(appRepository.findCatalogByName).mockResolvedValue(null)
      vi.mocked(appRepository.createCatalog).mockResolvedValue(mockCatalog)
      vi.mocked(appRepository.create).mockResolvedValue(mockApp as any)

      const result = await appService.createApp('user1', {
        path: 'C:\\Program Files\\NewApp.exe',
        catalogName: 'NewApp'
      })

      expect(appRepository.createCatalog).toHaveBeenCalledWith({
        name: 'NewApp'
      })
      expect(result).toEqual(mockApp)
    })
  })

  describe('updateApp', () => {
    it('should update app successfully', async () => {
      const mockApp = {
        id: '1',
        userId: 'user1',
        path: 'C:\\Program Files\\App1.exe',
        totalMinutes: 120
      }

      const updatedApp = {
        ...mockApp,
        totalMinutes: 150
      }

      vi.mocked(appRepository.findById).mockResolvedValue(mockApp as any)
      vi.mocked(appRepository.update).mockResolvedValue(updatedApp as any)

      const result = await appService.updateApp('1', 'user1', {
        totalMinutes: 150
      })

      expect(result.totalMinutes).toBe(150)
    })

    it('should throw NotFoundError if app not found', async () => {
      vi.mocked(appRepository.findById).mockResolvedValue(null)

      await expect(
        appService.updateApp('nonexistent', 'user1', { totalMinutes: 150 })
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteApp', () => {
    it('should delete app successfully', async () => {
      const mockApp = {
        id: '1',
        userId: 'user1',
        path: 'C:\\Program Files\\App1.exe'
      }

      vi.mocked(appRepository.findById).mockResolvedValue(mockApp as any)
      vi.mocked(appRepository.delete).mockResolvedValue()

      await appService.deleteApp('1', 'user1')

      expect(appRepository.delete).toHaveBeenCalledWith('1', 'user1')
    })

    it('should throw NotFoundError if app not found', async () => {
      vi.mocked(appRepository.findById).mockResolvedValue(null)

      await expect(
        appService.deleteApp('nonexistent', 'user1')
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getAllCatalogs', () => {
    it('should return all catalogs', async () => {
      const mockCatalogs = [
        { id: '1', name: 'App1', displayName: 'Application 1' },
        { id: '2', name: 'App2', displayName: 'Application 2' }
      ]

      vi.mocked(appRepository.getAllCatalogs).mockResolvedValue(mockCatalogs as any)

      const result = await appService.getAllCatalogs()

      expect(result).toEqual(mockCatalogs)
    })
  })
})
