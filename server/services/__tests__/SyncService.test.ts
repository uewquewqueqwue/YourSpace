import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SyncService } from '../SyncService'
import { prisma } from '../../prisma'
import { gmailApiService } from '../GmailApiService'
import { emailRepository } from '../../repositories/EmailRepository'
import logger from '../../utils/logger'

// Mock dependencies
vi.mock('../../prisma', () => ({
  prisma: {
    googleAccount: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('../GmailApiService', () => ({
  gmailApiService: {
    listMessages: vi.fn(),
    getMessage: vi.fn()
  }
}))

vi.mock('../../repositories/EmailRepository', () => ({
  emailRepository: {
    createEmail: vi.fn()
  }
}))

vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('SyncService', () => {
  let syncService: SyncService

  beforeEach(() => {
    syncService = new SyncService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    syncService.stopScheduler()
  })

  describe('initialSync', () => {
    it('should fetch last 100 emails for new account', async () => {
      // Arrange
      const accountId = 'account123'
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt: null,
        syncStatus: 'IDLE'
      }

      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg${i}`,
        threadId: `thread${i}`
      }))

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages,
        resultSizeEstimate: 100
      })
      vi.mocked(gmailApiService.getMessage).mockImplementation(async (_, msgId) => ({
        id: msgId,
        threadId: `thread${msgId}`,
        labelIds: [],
        snippet: 'Test preview',
        internalDate: Date.now().toString(),
        headers: {
          subject: 'Test Subject',
          from: 'sender@example.com',
          to: 'test@example.com'
        }
      }))
      vi.mocked(emailRepository.createEmail).mockResolvedValue({} as any)
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      const result = await syncService.initialSync(accountId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.newEmails).toBe(100)
      expect(result.errors).toHaveLength(0)
      expect(gmailApiService.listMessages).toHaveBeenCalledWith(accountId, {
        maxResults: 100
      })
      expect(emailRepository.createEmail).toHaveBeenCalledTimes(100)
      expect(prisma.googleAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: {
          lastSyncAt: expect.any(Date),
          syncStatus: 'IDLE'
        }
      })
    })

    it('should handle fewer than 100 emails', async () => {
      // Arrange
      const accountId = 'account123'
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt: null,
        syncStatus: 'IDLE'
      }

      const messages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg${i}`,
        threadId: `thread${i}`
      }))

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages,
        resultSizeEstimate: 50
      })
      vi.mocked(gmailApiService.getMessage).mockImplementation(async (_, msgId) => ({
        id: msgId,
        threadId: `thread${msgId}`,
        labelIds: [],
        snippet: 'Test preview',
        internalDate: Date.now().toString(),
        headers: {
          subject: 'Test Subject',
          from: 'sender@example.com',
          to: 'test@example.com'
        }
      }))
      vi.mocked(emailRepository.createEmail).mockResolvedValue({} as any)
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      const result = await syncService.initialSync(accountId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.newEmails).toBe(50)
      expect(emailRepository.createEmail).toHaveBeenCalledTimes(50)
    })

    it('should update sync status to SYNCING then IDLE', async () => {
      // Arrange
      const accountId = 'account123'
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt: null,
        syncStatus: 'IDLE'
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0
      })
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      await syncService.initialSync(accountId)

      // Assert
      expect(prisma.googleAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { syncStatus: 'SYNCING' }
      })
      expect(prisma.googleAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: {
          lastSyncAt: expect.any(Date),
          syncStatus: 'IDLE'
        }
      })
    })

    it('should set status to ERROR on failure', async () => {
      // Arrange
      const accountId = 'account123'
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt: null,
        syncStatus: 'IDLE'
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockRejectedValue(new Error('API Error'))
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      const result = await syncService.initialSync(accountId)

      // Assert
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(prisma.googleAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: { syncStatus: 'ERROR' }
      })
    })

    it('should continue syncing even if individual messages fail', async () => {
      // Arrange
      const accountId = 'account123'
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt: null,
        syncStatus: 'IDLE'
      }

      const messages = [
        { id: 'msg1', threadId: 'thread1' },
        { id: 'msg2', threadId: 'thread2' },
        { id: 'msg3', threadId: 'thread3' }
      ]

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages,
        resultSizeEstimate: 3
      })
      
      // msg2 fails, others succeed
      vi.mocked(gmailApiService.getMessage)
        .mockResolvedValueOnce({
          id: 'msg1',
          threadId: 'thread1',
          labelIds: [],
          snippet: 'Test',
          internalDate: Date.now().toString(),
          headers: { subject: 'Test', from: 'test@example.com' }
        })
        .mockRejectedValueOnce(new Error('Failed to fetch msg2'))
        .mockResolvedValueOnce({
          id: 'msg3',
          threadId: 'thread3',
          labelIds: [],
          snippet: 'Test',
          internalDate: Date.now().toString(),
          headers: { subject: 'Test', from: 'test@example.com' }
        })

      vi.mocked(emailRepository.createEmail).mockResolvedValue({} as any)
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      const result = await syncService.initialSync(accountId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.newEmails).toBe(2) // Only 2 succeeded
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('msg2')
    })
  })

  describe('incrementalSync', () => {
    it('should use after:{timestamp} query for incremental sync', async () => {
      // Arrange
      const accountId = 'account123'
      const lastSyncAt = new Date('2024-01-01T00:00:00Z')
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt,
        syncStatus: 'IDLE'
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0
      })
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      await syncService.incrementalSync(accountId)

      // Assert
      const expectedTimestamp = Math.floor(lastSyncAt.getTime() / 1000)
      expect(gmailApiService.listMessages).toHaveBeenCalledWith(accountId, {
        maxResults: 100,
        query: `after:${expectedTimestamp}`
      })
    })

    it('should fetch only new emails since lastSyncAt', async () => {
      // Arrange
      const accountId = 'account123'
      const lastSyncAt = new Date('2024-01-01T00:00:00Z')
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt,
        syncStatus: 'IDLE'
      }

      const newMessages = [
        { id: 'newMsg1', threadId: 'thread1' },
        { id: 'newMsg2', threadId: 'thread2' }
      ]

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: newMessages,
        resultSizeEstimate: 2
      })
      vi.mocked(gmailApiService.getMessage).mockImplementation(async (_, msgId) => ({
        id: msgId,
        threadId: `thread${msgId}`,
        labelIds: [],
        snippet: 'New email',
        internalDate: Date.now().toString(),
        headers: {
          subject: 'New Subject',
          from: 'sender@example.com',
          to: 'test@example.com'
        }
      }))
      vi.mocked(emailRepository.createEmail).mockResolvedValue({} as any)
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      const result = await syncService.incrementalSync(accountId)

      // Assert
      expect(result.success).toBe(true)
      expect(result.newEmails).toBe(2)
      expect(emailRepository.createEmail).toHaveBeenCalledTimes(2)
    })

    it('should update lastSyncAt after successful sync', async () => {
      // Arrange
      const accountId = 'account123'
      const lastSyncAt = new Date('2024-01-01T00:00:00Z')
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt,
        syncStatus: 'IDLE'
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0
      })
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      const beforeSync = Date.now()

      // Act
      await syncService.incrementalSync(accountId)

      const afterSync = Date.now()

      // Assert
      expect(prisma.googleAccount.update).toHaveBeenCalledWith({
        where: { id: accountId },
        data: {
          lastSyncAt: expect.any(Date),
          syncStatus: 'IDLE'
        }
      })

      const updateCall = vi.mocked(prisma.googleAccount.update).mock.calls.find(
        call => call[0].data && 'lastSyncAt' in call[0].data
      )
      const updatedTimestamp = (updateCall?.[0].data as any).lastSyncAt.getTime()
      expect(updatedTimestamp).toBeGreaterThanOrEqual(beforeSync)
      expect(updatedTimestamp).toBeLessThanOrEqual(afterSync)
    })
  })

  describe('syncAccount', () => {
    it('should call initialSync for accounts without lastSyncAt', async () => {
      // Arrange
      const accountId = 'account123'
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt: null,
        syncStatus: 'IDLE'
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0
      })
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      const result = await syncService.syncAccount(accountId)

      // Assert
      expect(result.accountId).toBe(accountId)
      expect(gmailApiService.listMessages).toHaveBeenCalledWith(accountId, {
        maxResults: 100
      })
    })

    it('should call incrementalSync for accounts with lastSyncAt', async () => {
      // Arrange
      const accountId = 'account123'
      const account = {
        id: accountId,
        email: 'test@example.com',
        lastSyncAt: new Date('2024-01-01T00:00:00Z'),
        syncStatus: 'IDLE'
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(account as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0
      })
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(account as any)

      // Act
      const result = await syncService.syncAccount(accountId)

      // Assert
      expect(result.accountId).toBe(accountId)
      expect(gmailApiService.listMessages).toHaveBeenCalledWith(accountId, {
        maxResults: 100,
        query: expect.stringContaining('after:')
      })
    })
  })

  describe('syncAllAccounts', () => {
    it('should sync all accounts sequentially', async () => {
      // Arrange
      const accounts = [
        { id: 'acc1', email: 'test1@example.com', lastSyncAt: null, syncStatus: 'IDLE' },
        { id: 'acc2', email: 'test2@example.com', lastSyncAt: new Date(), syncStatus: 'IDLE' },
        { id: 'acc3', email: 'test3@example.com', lastSyncAt: null, syncStatus: 'IDLE' }
      ]

      vi.mocked(prisma.googleAccount.findMany).mockResolvedValue(accounts as any)
      vi.mocked(prisma.googleAccount.findUnique)
        .mockResolvedValueOnce(accounts[0] as any)
        .mockResolvedValueOnce(accounts[1] as any)
        .mockResolvedValueOnce(accounts[2] as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0
      })
      vi.mocked(prisma.googleAccount.update).mockResolvedValue({} as any)

      // Act
      const results = await syncService.syncAllAccounts()

      // Assert
      expect(results).toHaveLength(3)
      expect(results[0].accountId).toBe('acc1')
      expect(results[1].accountId).toBe('acc2')
      expect(results[2].accountId).toBe('acc3')
    })

    it('should skip accounts with SYNCING status', async () => {
      // Arrange
      const accounts = [
        { id: 'acc1', email: 'test1@example.com', lastSyncAt: null, syncStatus: 'IDLE' }
      ]

      vi.mocked(prisma.googleAccount.findMany).mockResolvedValue(accounts as any)
      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(accounts[0] as any)
      vi.mocked(gmailApiService.listMessages).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0
      })
      vi.mocked(prisma.googleAccount.update).mockResolvedValue({} as any)

      // Act
      await syncService.syncAllAccounts()

      // Assert
      expect(prisma.googleAccount.findMany).toHaveBeenCalledWith({
        where: {
          syncStatus: {
            not: 'SYNCING'
          }
        },
        orderBy: {
          lastSyncAt: 'asc'
        }
      })
    })

    it('should continue syncing other accounts if one fails', async () => {
      // Arrange
      const accounts = [
        { id: 'acc1', email: 'test1@example.com', lastSyncAt: null, syncStatus: 'IDLE' },
        { id: 'acc2', email: 'test2@example.com', lastSyncAt: null, syncStatus: 'IDLE' }
      ]

      vi.mocked(prisma.googleAccount.findMany).mockResolvedValue(accounts as any)
      vi.mocked(prisma.googleAccount.findUnique)
        .mockResolvedValueOnce(accounts[0] as any)
        .mockResolvedValueOnce(accounts[1] as any)
      
      // First account fails, second succeeds
      vi.mocked(gmailApiService.listMessages)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ messages: [], resultSizeEstimate: 0 })
      
      vi.mocked(prisma.googleAccount.update).mockResolvedValue({} as any)

      // Act
      const results = await syncService.syncAllAccounts()

      // Assert
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(false)
      expect(results[1].success).toBe(true)
    })
  })

  describe('scheduler', () => {
    it('should start scheduler and run initial sync', async () => {
      // Arrange
      vi.mocked(prisma.googleAccount.findMany).mockResolvedValue([])

      // Act
      syncService.startScheduler()

      // Wait for initial sync to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      // Assert
      expect(prisma.googleAccount.findMany).toHaveBeenCalled()

      // Cleanup
      syncService.stopScheduler()
    })

    it('should not start scheduler if already running', () => {
      // Arrange
      syncService.startScheduler()

      // Act
      syncService.startScheduler()

      // Assert
      expect(logger.warn).toHaveBeenCalledWith('Sync scheduler is already running')

      // Cleanup
      syncService.stopScheduler()
    })

    it('should stop scheduler', () => {
      // Arrange
      syncService.startScheduler()

      // Act
      syncService.stopScheduler()

      // Assert
      expect(logger.info).toHaveBeenCalledWith('Sync scheduler stopped')
    })
  })
})
