import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ipcMain } from 'electron'
import { setupEmailHandlers } from '../email'
import { authenticate } from '../../middleware/auth'
import { accountManager } from '../../services/AccountManager'
import { syncService } from '../../services/SyncService'
import { emailRepository } from '../../repositories/EmailRepository'
import { oauthService } from '../../services/OAuthService'
import { gmailApiService } from '../../services/GmailApiService'

// Mock dependencies
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  },
  app: {
    getPath: vi.fn(() => '/mock/path'),
    getVersion: vi.fn(() => '1.0.0')
  }
}))

vi.mock('../../prisma', () => ({
  prisma: {}
}))

vi.mock('../../config/secrets', () => ({
  JWT_SECRET: 'test-secret',
  DATABASE_URL: 'postgresql://test'
}))

vi.mock('../../middleware/auth')
vi.mock('../../services/AccountManager')
vi.mock('../../services/SyncService')
vi.mock('../../repositories/EmailRepository')
vi.mock('../../services/OAuthService')
vi.mock('../../services/GmailApiService')
vi.mock('../../utils/errors', () => ({
  handleError: vi.fn((error) => { throw error })
}))
vi.mock('../../utils/rateLimit', () => ({
  rateLimit: vi.fn()
}))
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('Email IPC Handlers', () => {
  const mockUser = { id: 'user123', email: 'test@example.com' }
  const mockToken = 'valid-jwt-token'
  
  let handlers: Map<string, Function>

  beforeEach(() => {
    handlers = new Map()
    
    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers.set(channel, handler)
    })

    // Setup default mocks
    vi.mocked(authenticate).mockResolvedValue(mockUser)

    // Register handlers
    setupEmailHandlers()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('email:accounts:connect', () => {
    it('should generate OAuth URL for authenticated user', async () => {
      const mockAuthData = {
        authUrl: 'https://accounts.google.com/oauth',
        state: 'random-state'
      }

      vi.mocked(accountManager.connectAccount).mockResolvedValue(mockAuthData)

      const handler = handlers.get('email:accounts:connect')!
      const result = await handler({}, { token: mockToken })

      expect(authenticate).toHaveBeenCalledWith(mockToken)
      expect(accountManager.connectAccount).toHaveBeenCalledWith(mockUser.id)
      expect(result).toEqual({
        success: true,
        ...mockAuthData
      })
    })

    it('should throw error if user has reached 10 account limit', async () => {
      vi.mocked(accountManager.connectAccount).mockRejectedValue(
        new Error('You have reached the maximum of 10 connected accounts')
      )

      const handler = handlers.get('email:accounts:connect')!
      
      await expect(handler({}, { token: mockToken })).rejects.toThrow(
        'You have reached the maximum of 10 connected accounts'
      )
    })

    it('should throw error if token is invalid', async () => {
      vi.mocked(authenticate).mockRejectedValue(new Error('Invalid token'))

      const handler = handlers.get('email:accounts:connect')!
      
      await expect(handler({}, { token: 'invalid-token' })).rejects.toThrow('Invalid token')
    })
  })

  describe('email:accounts:callback', () => {
    it('should handle OAuth callback and create account', async () => {
      const mockAccount = {
        id: 'account123',
        email: 'gmail@example.com',
        lastSyncAt: null,
        syncStatus: 'IDLE' as const,
        userId: mockUser.id,
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiry: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(oauthService.handleCallback).mockResolvedValue(mockAccount)
      vi.mocked(syncService.syncAccount).mockResolvedValue({
        accountId: mockAccount.id,
        accountEmail: mockAccount.email,
        newEmails: 100,
        errors: [],
        success: true
      })

      const handler = handlers.get('email:accounts:callback')!
      const result = await handler({}, { code: 'auth-code', state: 'state-token' })

      expect(oauthService.handleCallback).toHaveBeenCalledWith('auth-code', 'state-token')
      expect(result).toEqual({
        success: true,
        account: {
          id: mockAccount.id,
          email: mockAccount.email,
          lastSyncAt: mockAccount.lastSyncAt,
          syncStatus: mockAccount.syncStatus
        }
      })
    })

    it('should throw error for invalid OAuth code', async () => {
      vi.mocked(oauthService.handleCallback).mockRejectedValue(
        new Error('Authorization failed. The code may have expired or been used already.')
      )

      const handler = handlers.get('email:accounts:callback')!
      
      await expect(handler({}, { code: 'invalid-code', state: 'state' })).rejects.toThrow(
        'Authorization failed'
      )
    })
  })

  describe('email:accounts:list', () => {
    it('should list all accounts with email counts', async () => {
      const mockAccounts = [
        { id: 'acc1', email: 'gmail1@example.com', lastSyncAt: new Date(), syncStatus: 'IDLE' as const, emailCount: 50 },
        { id: 'acc2', email: 'gmail2@example.com', lastSyncAt: null, syncStatus: 'IDLE' as const, emailCount: 0 }
      ]

      vi.mocked(accountManager.listAccounts).mockResolvedValue(mockAccounts)

      const handler = handlers.get('email:accounts:list')!
      const result = await handler({}, { token: mockToken })

      expect(authenticate).toHaveBeenCalledWith(mockToken)
      expect(accountManager.listAccounts).toHaveBeenCalledWith(mockUser.id)
      expect(result).toEqual({
        success: true,
        accounts: mockAccounts
      })
    })

    it('should return empty array if user has no accounts', async () => {
      vi.mocked(accountManager.listAccounts).mockResolvedValue([])

      const handler = handlers.get('email:accounts:list')!
      const result = await handler({}, { token: mockToken })

      expect(result).toEqual({
        success: true,
        accounts: []
      })
    })
  })

  describe('email:accounts:disconnect', () => {
    it('should disconnect account and delete emails', async () => {
      const mockAccount = {
        id: 'account123',
        userId: mockUser.id,
        email: 'gmail@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        tokenExpiry: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(accountManager.getAccount).mockResolvedValue(mockAccount)
      vi.mocked(accountManager.disconnectAccount).mockResolvedValue({ emailsDeleted: 50 })

      const handler = handlers.get('email:accounts:disconnect')!
      const result = await handler({}, { token: mockToken, accountId: 'account123' })

      expect(accountManager.getAccount).toHaveBeenCalledWith('account123')
      expect(accountManager.disconnectAccount).toHaveBeenCalledWith('account123')
      expect(result).toEqual({
        success: true,
        emailsDeleted: 50
      })
    })

    it('should throw error if account does not belong to user', async () => {
      const mockAccount = {
        id: 'account123',
        userId: 'other-user',
        email: 'gmail@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        tokenExpiry: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(accountManager.getAccount).mockResolvedValue(mockAccount)

      const handler = handlers.get('email:accounts:disconnect')!
      
      await expect(handler({}, { token: mockToken, accountId: 'account123' })).rejects.toThrow(
        'Account not found or access denied'
      )
    })
  })

  describe('email:sync:trigger', () => {
    it('should trigger manual sync for all user accounts', async () => {
      const mockAccounts = [
        { id: 'acc1', email: 'gmail1@example.com', lastSyncAt: new Date(), syncStatus: 'IDLE' as const, emailCount: 50 },
        { id: 'acc2', email: 'gmail2@example.com', lastSyncAt: null, syncStatus: 'IDLE' as const, emailCount: 0 }
      ]

      const mockResults = [
        { accountId: 'acc1', accountEmail: 'gmail1@example.com', newEmails: 5, errors: [], success: true },
        { accountId: 'acc2', accountEmail: 'gmail2@example.com', newEmails: 100, errors: [], success: true }
      ]

      vi.mocked(accountManager.listAccounts).mockResolvedValue(mockAccounts)
      vi.mocked(syncService.syncAccount)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])

      const handler = handlers.get('email:sync:trigger')!
      const result = await handler({}, { token: mockToken })

      expect(accountManager.listAccounts).toHaveBeenCalledWith(mockUser.id)
      expect(syncService.syncAccount).toHaveBeenCalledTimes(2)
      expect(result).toEqual({
        success: true,
        results: mockResults
      })
    })
  })

  describe('email:list', () => {
    it('should list emails with default pagination', async () => {
      const mockAccounts = [
        { id: 'acc1', email: 'gmail@example.com', lastSyncAt: new Date(), syncStatus: 'IDLE' as const, emailCount: 50 }
      ]

      const mockEmails = [
        {
          id: 'email1',
          accountId: 'acc1',
          gmailId: 'gmail1',
          threadId: 'thread1',
          subject: 'Test Email',
          sender: 'sender@example.com',
          recipient: 'gmail@example.com',
          preview: 'Email preview',
          isRead: false,
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.mocked(accountManager.listAccounts).mockResolvedValue(mockAccounts)
      vi.mocked(emailRepository.listEmails).mockResolvedValue({
        emails: mockEmails,
        total: 1
      })

      const handler = handlers.get('email:list')!
      const result = await handler({}, { token: mockToken })

      expect(emailRepository.listEmails).toHaveBeenCalledWith({
        accountId: undefined,
        isRead: undefined,
        limit: 50,
        offset: 0
      })
      expect(result.success).toBe(true)
      expect(result.emails).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.hasMore).toBe(false)
    })

    it('should filter emails by account', async () => {
      const mockAccount = {
        id: 'acc1',
        userId: mockUser.id,
        email: 'gmail@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        tokenExpiry: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(accountManager.getAccount).mockResolvedValue(mockAccount)
      vi.mocked(emailRepository.listEmails).mockResolvedValue({
        emails: [],
        total: 0
      })

      const handler = handlers.get('email:list')!
      await handler({}, { token: mockToken, accountId: 'acc1' })

      expect(accountManager.getAccount).toHaveBeenCalledWith('acc1')
      expect(emailRepository.listEmails).toHaveBeenCalledWith({
        accountId: 'acc1',
        isRead: undefined,
        limit: 50,
        offset: 0
      })
    })

    it('should filter emails by read status', async () => {
      vi.mocked(accountManager.listAccounts).mockResolvedValue([
        { id: 'acc1', email: 'gmail@example.com', lastSyncAt: new Date(), syncStatus: 'IDLE' as const, emailCount: 50 }
      ])
      vi.mocked(emailRepository.listEmails).mockResolvedValue({
        emails: [],
        total: 0
      })

      const handler = handlers.get('email:list')!
      await handler({}, { token: mockToken, isRead: false })

      expect(emailRepository.listEmails).toHaveBeenCalledWith({
        accountId: undefined,
        isRead: false,
        limit: 50,
        offset: 0
      })
    })
  })

  describe('email:markRead', () => {
    it('should update email read status', async () => {
      const mockEmail = {
        id: 'email123',
        accountId: 'acc1',
        gmailId: 'gmail123',
        threadId: 'thread1',
        subject: 'Test',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview',
        isRead: false,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockAccount = {
        id: 'acc1',
        userId: mockUser.id,
        email: 'gmail@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        tokenExpiry: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(emailRepository.findById).mockResolvedValue(mockEmail)
      vi.mocked(accountManager.getAccount).mockResolvedValue(mockAccount)
      vi.mocked(emailRepository.updateReadStatus).mockResolvedValue({
        ...mockEmail,
        isRead: true
      })
      vi.mocked(gmailApiService.modifyMessage).mockResolvedValue(undefined)

      const handler = handlers.get('email:markRead')!
      const result = await handler({}, { token: mockToken, emailId: 'email123', isRead: true })

      expect(emailRepository.findById).toHaveBeenCalledWith('email123')
      expect(emailRepository.updateReadStatus).toHaveBeenCalledWith('email123', true)
      expect(result.success).toBe(true)
      expect(result.email.isRead).toBe(true)
    })

    it('should throw error if email does not belong to user', async () => {
      const mockEmail = {
        id: 'email123',
        accountId: 'acc1',
        gmailId: 'gmail123',
        threadId: 'thread1',
        subject: 'Test',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview',
        isRead: false,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const mockAccount = {
        id: 'acc1',
        userId: 'other-user',
        email: 'gmail@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        tokenExpiry: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(emailRepository.findById).mockResolvedValue(mockEmail)
      vi.mocked(accountManager.getAccount).mockResolvedValue(mockAccount)

      const handler = handlers.get('email:markRead')!
      
      await expect(handler({}, { token: mockToken, emailId: 'email123', isRead: true })).rejects.toThrow(
        'Email not found or access denied'
      )
    })
  })

  describe('email:search', () => {
    it('should search emails across subject, sender, preview', async () => {
      const mockEmails = [
        {
          id: 'email1',
          accountId: 'acc1',
          gmailId: 'gmail1',
          threadId: 'thread1',
          subject: 'Important Meeting',
          sender: 'boss@example.com',
          recipient: 'me@example.com',
          preview: 'Meeting tomorrow',
          isRead: false,
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      vi.mocked(emailRepository.searchEmails).mockResolvedValue(mockEmails)

      const handler = handlers.get('email:search')!
      const result = await handler({}, { token: mockToken, query: 'meeting' })

      expect(emailRepository.searchEmails).toHaveBeenCalledWith('meeting', {
        accountId: undefined,
        limit: 50
      })
      expect(result.success).toBe(true)
      expect(result.emails).toHaveLength(1)
      expect(result.emails[0].subject).toBe('Important Meeting')
    })

    it('should return empty results for empty query', async () => {
      const handler = handlers.get('email:search')!
      const result = await handler({}, { token: mockToken, query: '' })

      expect(emailRepository.searchEmails).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        emails: []
      })
    })

    it('should filter search by account', async () => {
      const mockAccount = {
        id: 'acc1',
        userId: mockUser.id,
        email: 'gmail@example.com',
        accessToken: 'encrypted',
        refreshToken: 'encrypted',
        tokenExpiry: new Date(),
        lastSyncAt: new Date(),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(accountManager.getAccount).mockResolvedValue(mockAccount)
      vi.mocked(emailRepository.searchEmails).mockResolvedValue([])

      const handler = handlers.get('email:search')!
      await handler({}, { token: mockToken, query: 'test', accountId: 'acc1' })

      expect(accountManager.getAccount).toHaveBeenCalledWith('acc1')
      expect(emailRepository.searchEmails).toHaveBeenCalledWith('test', {
        accountId: 'acc1',
        limit: 50
      })
    })
  })
})
