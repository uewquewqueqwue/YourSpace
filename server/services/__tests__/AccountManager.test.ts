import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { accountManager } from '../AccountManager'
import { oauthService } from '../OAuthService'
import { emailRepository } from '../../repositories/EmailRepository'
import { prisma } from '../../prisma'

// Mock dependencies
vi.mock('../OAuthService')
vi.mock('../../repositories/EmailRepository')
vi.mock('../../prisma', () => ({
  prisma: {
    googleAccount: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn()
    },
    email: {
      count: vi.fn()
    }
  }
}))
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

describe('AccountManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('connectAccount', () => {
    it('should generate OAuth URL when user has less than 10 accounts', async () => {
      // Mock: user has 5 accounts
      vi.mocked(prisma.googleAccount.count).mockResolvedValue(5)
      
      // Mock OAuth service
      vi.mocked(oauthService.generateAuthUrl).mockResolvedValue({
        url: 'https://accounts.google.com/oauth?...',
        state: 'state123'
      })

      const result = await accountManager.connectAccount('user123')

      expect(prisma.googleAccount.count).toHaveBeenCalledWith({
        where: { userId: 'user123' }
      })
      expect(oauthService.generateAuthUrl).toHaveBeenCalledWith('user123')
      expect(result).toEqual({
        authUrl: 'https://accounts.google.com/oauth?...',
        state: 'state123'
      })
    })

    it('should allow connecting when user has exactly 9 accounts', async () => {
      // Mock: user has 9 accounts (one below limit)
      vi.mocked(prisma.googleAccount.count).mockResolvedValue(9)
      
      vi.mocked(oauthService.generateAuthUrl).mockResolvedValue({
        url: 'https://accounts.google.com/oauth?...',
        state: 'state123',
        codeVerifier: 'verifier123'
      })

      const result = await accountManager.connectAccount('user123')

      expect(result.authUrl).toBeDefined()
      expect(oauthService.generateAuthUrl).toHaveBeenCalled()
    })

    it('should throw error when user has 10 accounts (limit reached)', async () => {
      // Mock: user has 10 accounts (at limit)
      vi.mocked(prisma.googleAccount.count).mockResolvedValue(10)

      await expect(accountManager.connectAccount('user123')).rejects.toThrow(
        'You have reached the maximum of 10 connected accounts'
      )

      // Should not call OAuth service
      expect(oauthService.generateAuthUrl).not.toHaveBeenCalled()
    })

    it('should throw error when user has more than 10 accounts', async () => {
      // Mock: user somehow has 11 accounts
      vi.mocked(prisma.googleAccount.count).mockResolvedValue(11)

      await expect(accountManager.connectAccount('user123')).rejects.toThrow(
        'You have reached the maximum of 10 connected accounts'
      )
    })

    it('should allow connecting when user has 0 accounts', async () => {
      // Mock: new user with no accounts
      vi.mocked(prisma.googleAccount.count).mockResolvedValue(0)
      
      vi.mocked(oauthService.generateAuthUrl).mockResolvedValue({
        url: 'https://accounts.google.com/oauth?...',
        state: 'state123',
        codeVerifier: 'verifier123'
      })

      const result = await accountManager.connectAccount('user123')

      expect(result.authUrl).toBeDefined()
    })
  })

  describe('disconnectAccount', () => {
    it('should delete account and all associated emails', async () => {
      // Mock: account exists
      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue({
        id: 'account123',
        userId: 'user123',
        email: 'test@gmail.com',
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(),
        lastSyncAt: null,
        syncStatus: 'IDLE',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock: 50 emails deleted
      vi.mocked(emailRepository.deleteByAccount).mockResolvedValue(50)
      
      vi.mocked(prisma.googleAccount.delete).mockResolvedValue({} as any)

      const result = await accountManager.disconnectAccount('account123')

      expect(prisma.googleAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'account123' }
      })
      expect(emailRepository.deleteByAccount).toHaveBeenCalledWith('account123')
      expect(prisma.googleAccount.delete).toHaveBeenCalledWith({
        where: { id: 'account123' }
      })
      expect(result.emailsDeleted).toBe(50)
    })

    it('should handle account with no emails', async () => {
      // Mock: account exists
      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue({
        id: 'account123',
        userId: 'user123',
        email: 'test@gmail.com',
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(),
        lastSyncAt: null,
        syncStatus: 'IDLE',
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock: 0 emails deleted
      vi.mocked(emailRepository.deleteByAccount).mockResolvedValue(0)
      
      vi.mocked(prisma.googleAccount.delete).mockResolvedValue({} as any)

      const result = await accountManager.disconnectAccount('account123')

      expect(result.emailsDeleted).toBe(0)
      expect(prisma.googleAccount.delete).toHaveBeenCalled()
    })

    it('should throw error when account does not exist', async () => {
      // Mock: account not found
      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(null)

      await expect(accountManager.disconnectAccount('nonexistent')).rejects.toThrow(
        'Account not found'
      )

      // Should not attempt to delete emails or account
      expect(emailRepository.deleteByAccount).not.toHaveBeenCalled()
      expect(prisma.googleAccount.delete).not.toHaveBeenCalled()
    })
  })

  describe('listAccounts', () => {
    it('should return all accounts with email counts', async () => {
      // Mock: user has 3 accounts
      vi.mocked(prisma.googleAccount.findMany).mockResolvedValue([
        {
          id: 'account1',
          userId: 'user123',
          email: 'test1@gmail.com',
          accessToken: 'encrypted1',
          refreshToken: 'refresh1',
          tokenExpiry: new Date(),
          lastSyncAt: new Date('2024-01-01'),
          syncStatus: 'IDLE',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'account2',
          userId: 'user123',
          email: 'test2@gmail.com',
          accessToken: 'encrypted2',
          refreshToken: 'refresh2',
          tokenExpiry: new Date(),
          lastSyncAt: null,
          syncStatus: 'SYNCING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'account3',
          userId: 'user123',
          email: 'test3@gmail.com',
          accessToken: 'encrypted3',
          refreshToken: 'refresh3',
          tokenExpiry: new Date(),
          lastSyncAt: new Date('2024-01-02'),
          syncStatus: 'ERROR',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ])

      // Mock email counts for each account
      vi.mocked(prisma.email.count)
        .mockResolvedValueOnce(25) // account1 has 25 emails
        .mockResolvedValueOnce(0)  // account2 has 0 emails
        .mockResolvedValueOnce(100) // account3 has 100 emails

      const result = await accountManager.listAccounts('user123')

      expect(prisma.googleAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        orderBy: { createdAt: 'asc' }
      })
      
      expect(result).toHaveLength(3)
      
      expect(result[0]).toEqual({
        id: 'account1',
        email: 'test1@gmail.com',
        lastSyncAt: expect.any(Date),
        syncStatus: 'IDLE',
        emailCount: 25
      })
      
      expect(result[1]).toEqual({
        id: 'account2',
        email: 'test2@gmail.com',
        lastSyncAt: null,
        syncStatus: 'SYNCING',
        emailCount: 0
      })
      
      expect(result[2]).toEqual({
        id: 'account3',
        email: 'test3@gmail.com',
        lastSyncAt: expect.any(Date),
        syncStatus: 'ERROR',
        emailCount: 100
      })
    })

    it('should return empty array when user has no accounts', async () => {
      // Mock: user has no accounts
      vi.mocked(prisma.googleAccount.findMany).mockResolvedValue([])

      const result = await accountManager.listAccounts('user123')

      expect(result).toEqual([])
      expect(prisma.email.count).not.toHaveBeenCalled()
    })

    it('should handle accounts ordered by creation date', async () => {
      const oldDate = new Date('2023-01-01')
      const newDate = new Date('2024-01-01')

      vi.mocked(prisma.googleAccount.findMany).mockResolvedValue([
        {
          id: 'account1',
          userId: 'user123',
          email: 'old@gmail.com',
          accessToken: 'encrypted1',
          refreshToken: 'refresh1',
          tokenExpiry: new Date(),
          lastSyncAt: null,
          syncStatus: 'IDLE',
          createdAt: oldDate,
          updatedAt: new Date()
        },
        {
          id: 'account2',
          userId: 'user123',
          email: 'new@gmail.com',
          accessToken: 'encrypted2',
          refreshToken: 'refresh2',
          tokenExpiry: new Date(),
          lastSyncAt: null,
          syncStatus: 'IDLE',
          createdAt: newDate,
          updatedAt: new Date()
        }
      ])

      vi.mocked(prisma.email.count).mockResolvedValue(0)

      const result = await accountManager.listAccounts('user123')

      // Should be ordered by createdAt ascending (oldest first)
      expect(result[0].email).toBe('old@gmail.com')
      expect(result[1].email).toBe('new@gmail.com')
    })
  })

  describe('getAccount', () => {
    it('should return account when it exists', async () => {
      const mockAccount = {
        id: 'account123',
        userId: 'user123',
        email: 'test@gmail.com',
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(),
        lastSyncAt: null,
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(mockAccount)

      const result = await accountManager.getAccount('account123')

      expect(prisma.googleAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 'account123' }
      })
      expect(result).toEqual(mockAccount)
    })

    it('should return null when account does not exist', async () => {
      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(null)

      const result = await accountManager.getAccount('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getAccountCount', () => {
    it('should return correct account count', async () => {
      vi.mocked(prisma.googleAccount.count).mockResolvedValue(7)

      const result = await accountManager.getAccountCount('user123')

      expect(prisma.googleAccount.count).toHaveBeenCalledWith({
        where: { userId: 'user123' }
      })
      expect(result).toBe(7)
    })

    it('should return 0 when user has no accounts', async () => {
      vi.mocked(prisma.googleAccount.count).mockResolvedValue(0)

      const result = await accountManager.getAccountCount('user123')

      expect(result).toBe(0)
    })
  })
})
