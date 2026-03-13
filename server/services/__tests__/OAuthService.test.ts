// Set environment variables BEFORE any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.OAUTH_ENCRYPTION_KEY = 'a'.repeat(64)
process.env.GOOGLE_CLIENT_ID = 'test_client_id'
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret'
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/oauth/callback'

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { encryptionService } from '../EncryptionService'
import { google } from 'googleapis'

// Mock prisma
vi.mock('../../prisma', () => ({
  prisma: {
    googleAccount: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    $disconnect: vi.fn()
  }
}))

// Mock googleapis
vi.mock('googleapis', () => {
  const mockOAuth2Client = {
    generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?...'),
    getToken: vi.fn().mockResolvedValue({
      tokens: {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expiry_date: Date.now() + 3600000,
        expires_in: 3600
      }
    }),
    setCredentials: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue({
      credentials: {
        access_token: 'new_mock_access_token',
        expiry_date: Date.now() + 3600000,
        expires_in: 3600
      }
    })
  }

  class MockOAuth2 {
    constructor() {
      return mockOAuth2Client
    }
  }

  return {
    google: {
      auth: {
        OAuth2: MockOAuth2
      },
      oauth2: vi.fn().mockReturnValue({
        userinfo: {
          get: vi.fn().mockResolvedValue({
            data: {
              email: 'test@example.com'
            }
          })
        }
      })
    }
  }
})

import { prisma } from '../../prisma'
import { OAuthService } from '../OAuthService'

describe('OAuthService', () => {
  let oauthService: OAuthService
  const testUserId = 'test_user_123'

  beforeEach(() => {
    vi.clearAllMocks()
    oauthService = new OAuthService()
  })

  describe('constructor', () => {
    it('should initialize successfully with valid credentials', () => {
      expect(() => new OAuthService()).not.toThrow()
    })
  })

  describe('generateAuthUrl', () => {
    it('should generate auth URL with state', async () => {
      const result = await oauthService.generateAuthUrl(testUserId)

      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('state')
      expect(typeof result.url).toBe('string')
      expect(typeof result.state).toBe('string')
      expect(result.state.length).toBeGreaterThan(0)
    })

    it('should generate unique state tokens', async () => {
      const result1 = await oauthService.generateAuthUrl(testUserId)
      const result2 = await oauthService.generateAuthUrl(testUserId)

      expect(result1.state).not.toBe(result2.state)
    })
  })

  describe('handleCallback', () => {
    it('should create new account with encrypted tokens', async () => {
      const mockAccount = {
        id: 'account_123',
        userId: testUserId,
        email: 'test@example.com',
        accessToken: encryptionService.encrypt('mock_access_token'),
        refreshToken: encryptionService.encrypt('mock_refresh_token'),
        tokenExpiry: new Date(Date.now() + 3600000),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.googleAccount.create).mockResolvedValue(mockAccount)

      const { state } = await oauthService.generateAuthUrl(testUserId)
      const account = await oauthService.handleCallback('mock_auth_code', state)

      expect(account).toBeDefined()
      expect(account.userId).toBe(testUserId)
      expect(account.email).toBe('test@example.com')
      expect(account.syncStatus).toBe('IDLE')

      // Verify tokens are encrypted
      expect(account.accessToken).not.toBe('mock_access_token')
      expect(account.refreshToken).not.toBe('mock_refresh_token')
    })

    it('should throw error for invalid state', async () => {
      await expect(
        oauthService.handleCallback('mock_auth_code', 'invalid_state')
      ).rejects.toThrow('Authentication error')
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh expired access token', async () => {
      const mockAccount = {
        id: 'account_123',
        userId: testUserId,
        email: 'test@example.com',
        accessToken: encryptionService.encrypt('old_access_token'),
        refreshToken: encryptionService.encrypt('mock_refresh_token'),
        tokenExpiry: new Date(Date.now() - 1000),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null
      }

      const updatedAccount = {
        ...mockAccount,
        accessToken: encryptionService.encrypt('new_mock_access_token'),
        tokenExpiry: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(mockAccount)
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(updatedAccount)

      const result = await oauthService.refreshAccessToken('account_123')

      expect(result.id).toBe('account_123')
      expect(result.tokenExpiry.getTime()).toBeGreaterThan(Date.now())
    })

    it('should throw error for non-existent account', async () => {
      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(null)

      await expect(
        oauthService.refreshAccessToken('non_existent_id')
      ).rejects.toThrow('Failed to refresh access token')
    })
  })

  describe('getDecryptedTokens', () => {
    it('should return decrypted tokens', async () => {
      const mockAccount = {
        id: 'account_123',
        userId: testUserId,
        email: 'test@example.com',
        accessToken: encryptionService.encrypt('test_access_token'),
        refreshToken: encryptionService.encrypt('test_refresh_token'),
        tokenExpiry: new Date(Date.now() + 3600000),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(mockAccount)

      const tokens = await oauthService.getDecryptedTokens('account_123')

      expect(tokens.accessToken).toBe('test_access_token')
      expect(tokens.refreshToken).toBe('test_refresh_token')
    })

    it('should throw error for non-existent account', async () => {
      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(null)

      await expect(
        oauthService.getDecryptedTokens('non_existent_id')
      ).rejects.toThrow('Account not found')
    })
  })

  describe('ensureValidToken', () => {
    it('should return valid token if not expired', async () => {
      const mockAccount = {
        id: 'account_123',
        userId: testUserId,
        email: 'test@example.com',
        accessToken: encryptionService.encrypt('valid_token'),
        refreshToken: encryptionService.encrypt('refresh_token'),
        tokenExpiry: new Date(Date.now() + 3600000),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(mockAccount)

      const token = await oauthService.ensureValidToken('account_123')

      expect(token).toBe('valid_token')
    })

    it('should refresh token if expired', async () => {
      const expiredAccount = {
        id: 'account_123',
        userId: testUserId,
        email: 'test@example.com',
        accessToken: encryptionService.encrypt('expired_token'),
        refreshToken: encryptionService.encrypt('refresh_token'),
        tokenExpiry: new Date(Date.now() - 1000),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null
      }

      const refreshedAccount = {
        ...expiredAccount,
        accessToken: encryptionService.encrypt('new_mock_access_token'),
        tokenExpiry: new Date(Date.now() + 3600000)
      }

      vi.mocked(prisma.googleAccount.findUnique)
        .mockResolvedValueOnce(expiredAccount)
        .mockResolvedValueOnce(expiredAccount)
      vi.mocked(prisma.googleAccount.update).mockResolvedValue(refreshedAccount)

      const token = await oauthService.ensureValidToken('account_123')

      expect(token).toBe('new_mock_access_token')
    })
  })

  describe('token encryption', () => {
    it('should encrypt tokens before storage', async () => {
      const mockAccount = {
        id: 'account_123',
        userId: testUserId,
        email: 'test@example.com',
        accessToken: encryptionService.encrypt('mock_access_token'),
        refreshToken: encryptionService.encrypt('mock_refresh_token'),
        tokenExpiry: new Date(Date.now() + 3600000),
        syncStatus: 'IDLE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSyncAt: null
      }

      vi.mocked(prisma.googleAccount.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.googleAccount.create).mockResolvedValue(mockAccount)

      const { state } = await oauthService.generateAuthUrl(testUserId)
      const account = await oauthService.handleCallback('mock_auth_code', state)

      // Tokens should be in encrypted format (iv:data:tag)
      expect(account.accessToken).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/)
      expect(account.refreshToken).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/)
    })
  })
})
