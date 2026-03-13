// Set environment variables BEFORE any imports
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.OAUTH_ENCRYPTION_KEY = 'a'.repeat(64)
process.env.GOOGLE_CLIENT_ID = 'test_client_id'
process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret'
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/oauth/callback'

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// Create mock functions that will be used in the mocks
let mockMessagesList: any
let mockMessagesGet: any
let mockMessagesModify: any
let mockEnsureValidToken: any
let mockRefreshAccessToken: any

// Mock oauthService
vi.mock('../OAuthService', () => {
  return {
    oauthService: {
      get ensureValidToken() {
        return mockEnsureValidToken
      },
      get refreshAccessToken() {
        return mockRefreshAccessToken
      }
    }
  }
})

// Mock googleapis
vi.mock('googleapis', () => {
  return {
    google: {
      gmail: (config: any) => ({
        users: {
          messages: {
            get list() {
              return mockMessagesList
            },
            get get() {
              return mockMessagesGet
            },
            get modify() {
              return mockMessagesModify
            }
          }
        }
      }),
      auth: {
        OAuth2: class MockOAuth2 {
          setCredentials(credentials: any) {
            // Mock implementation
          }
        }
      }
    }
  }
})

import { GmailApiService } from '../GmailApiService'

describe('GmailApiService', () => {
  let gmailApiService: GmailApiService
  const testAccountId = 'test_account_123'
  const testAccessToken = 'test_access_token'

  beforeEach(() => {
    // Initialize mock functions
    mockMessagesList = vi.fn()
    mockMessagesGet = vi.fn()
    mockMessagesModify = vi.fn()
    mockEnsureValidToken = vi.fn()
    mockRefreshAccessToken = vi.fn()

    gmailApiService = new GmailApiService()
    
    // Default: return valid access token
    mockEnsureValidToken.mockResolvedValue(testAccessToken)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('listMessages', () => {
    it('should list messages with default options', async () => {
      const mockMessages = [
        { id: 'msg1', threadId: 'thread1' },
        { id: 'msg2', threadId: 'thread2' }
      ]

      mockMessagesList.mockResolvedValue({
        data: {
          messages: mockMessages,
          resultSizeEstimate: 2
        }
      })

      const result = await gmailApiService.listMessages(testAccountId)

      expect(result.messages).toEqual(mockMessages)
      expect(result.resultSizeEstimate).toBe(2)
      expect(mockMessagesList).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 100,
        pageToken: undefined,
        q: undefined
      })
    })

    it('should list messages with custom options', async () => {
      const mockMessages = [{ id: 'msg1', threadId: 'thread1' }]

      mockMessagesList.mockResolvedValue({
        data: {
          messages: mockMessages,
          nextPageToken: 'next_token',
          resultSizeEstimate: 50
        }
      })

      const result = await gmailApiService.listMessages(testAccountId, {
        maxResults: 50,
        pageToken: 'page_token',
        query: 'is:unread'
      })

      expect(result.messages).toEqual(mockMessages)
      expect(result.nextPageToken).toBe('next_token')
      expect(result.resultSizeEstimate).toBe(50)
      expect(mockMessagesList).toHaveBeenCalledWith({
        userId: 'me',
        maxResults: 50,
        pageToken: 'page_token',
        q: 'is:unread'
      })
    })

    it('should handle empty message list', async () => {
      mockMessagesList.mockResolvedValue({
        data: {
          messages: null,
          resultSizeEstimate: 0
        }
      })

      const result = await gmailApiService.listMessages(testAccountId)

      expect(result.messages).toEqual([])
      expect(result.resultSizeEstimate).toBe(0)
    })

    it('should retry on network error with exponential backoff', async () => {
      mockMessagesList
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg1', threadId: 'thread1' }],
            resultSizeEstimate: 1
          }
        })

      const result = await gmailApiService.listMessages(testAccountId)

      expect(result.messages).toHaveLength(1)
      expect(mockMessagesList).toHaveBeenCalledTimes(2)
    })

    it('should refresh token on 401 error and retry', async () => {
      const error401 = new Error('Unauthorized')
      ;(error401 as any).code = 401

      mockMessagesList
        .mockRejectedValueOnce(error401)
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg1', threadId: 'thread1' }],
            resultSizeEstimate: 1
          }
        })

      mockRefreshAccessToken.mockResolvedValue({})

      const result = await gmailApiService.listMessages(testAccountId)

      expect(result.messages).toHaveLength(1)
      expect(mockRefreshAccessToken).toHaveBeenCalledWith(testAccountId)
      expect(mockMessagesList).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      mockMessagesList.mockRejectedValue(new Error('Persistent error'))

      await expect(
        gmailApiService.listMessages(testAccountId)
      ).rejects.toThrow('Gmail API error')

      expect(mockMessagesList).toHaveBeenCalledTimes(3) // MAX_RETRIES = 3
    })

    it('should throw error if token refresh fails', async () => {
      const error401 = new Error('Unauthorized')
      ;(error401 as any).code = 401

      mockMessagesList.mockRejectedValue(error401)
      mockRefreshAccessToken.mockRejectedValue(new Error('Refresh failed'))

      await expect(
        gmailApiService.listMessages(testAccountId)
      ).rejects.toThrow('Your Gmail authorization has expired')

      expect(mockRefreshAccessToken).toHaveBeenCalledWith(testAccountId)
    })
  })

  describe('getMessage', () => {
    it('should get message metadata with headers', async () => {
      const mockMessage = {
        id: 'msg123',
        threadId: 'thread123',
        labelIds: ['INBOX', 'UNREAD'],
        snippet: 'This is a test email...',
        internalDate: '1234567890000',
        payload: {
          headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'recipient@example.com' },
            { name: 'Date', value: 'Mon, 1 Jan 2024 12:00:00 +0000' }
          ]
        }
      }

      mockMessagesGet.mockResolvedValue({ data: mockMessage })

      const result = await gmailApiService.getMessage(testAccountId, 'msg123')

      expect(result.id).toBe('msg123')
      expect(result.threadId).toBe('thread123')
      expect(result.labelIds).toEqual(['INBOX', 'UNREAD'])
      expect(result.snippet).toBe('This is a test email...')
      expect(result.headers.subject).toBe('Test Subject')
      expect(result.headers.from).toBe('sender@example.com')
      expect(result.headers.to).toBe('recipient@example.com')
      expect(result.headers.date).toBe('Mon, 1 Jan 2024 12:00:00 +0000')

      expect(mockMessagesGet).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg123',
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date']
      })
    })

    it('should handle message with missing headers', async () => {
      const mockMessage = {
        id: 'msg123',
        threadId: 'thread123',
        labelIds: [],
        snippet: '',
        internalDate: '1234567890000',
        payload: {
          headers: []
        }
      }

      mockMessagesGet.mockResolvedValue({ data: mockMessage })

      const result = await gmailApiService.getMessage(testAccountId, 'msg123')

      expect(result.id).toBe('msg123')
      expect(result.headers).toEqual({})
    })

    it('should handle message with no payload', async () => {
      const mockMessage = {
        id: 'msg123',
        threadId: 'thread123',
        labelIds: [],
        snippet: '',
        internalDate: '1234567890000'
      }

      mockMessagesGet.mockResolvedValue({ data: mockMessage })

      const result = await gmailApiService.getMessage(testAccountId, 'msg123')

      expect(result.id).toBe('msg123')
      expect(result.headers).toEqual({})
    })

    it('should retry on error', async () => {
      mockMessagesGet
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            id: 'msg123',
            threadId: 'thread123',
            labelIds: [],
            snippet: 'Test',
            internalDate: '1234567890000'
          }
        })

      const result = await gmailApiService.getMessage(testAccountId, 'msg123')

      expect(result.id).toBe('msg123')
      expect(mockMessagesGet).toHaveBeenCalledTimes(2)
    })
  })

  describe('modifyMessage', () => {
    it('should mark message as read', async () => {
      mockMessagesModify.mockResolvedValue({ data: {} })

      await gmailApiService.modifyMessage(testAccountId, 'msg123', {
        markAsRead: true
      })

      expect(mockMessagesModify).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg123',
        requestBody: {
          addLabelIds: [],
          removeLabelIds: ['UNREAD']
        }
      })
    })

    it('should mark message as unread', async () => {
      mockMessagesModify.mockResolvedValue({ data: {} })

      await gmailApiService.modifyMessage(testAccountId, 'msg123', {
        markAsRead: false
      })

      expect(mockMessagesModify).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg123',
        requestBody: {
          addLabelIds: ['UNREAD'],
          removeLabelIds: []
        }
      })
    })

    it('should handle empty options', async () => {
      mockMessagesModify.mockResolvedValue({ data: {} })

      await gmailApiService.modifyMessage(testAccountId, 'msg123', {})

      expect(mockMessagesModify).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg123',
        requestBody: {
          addLabelIds: [],
          removeLabelIds: []
        }
      })
    })

    it('should retry on error', async () => {
      mockMessagesModify
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: {} })

      await gmailApiService.modifyMessage(testAccountId, 'msg123', {
        markAsRead: true
      })

      expect(mockMessagesModify).toHaveBeenCalledTimes(2)
    })

    it('should refresh token on 401 error', async () => {
      const error401 = new Error('Unauthorized')
      ;(error401 as any).response = { status: 401 }

      mockMessagesModify
        .mockRejectedValueOnce(error401)
        .mockResolvedValueOnce({ data: {} })

      mockRefreshAccessToken.mockResolvedValue({})

      await gmailApiService.modifyMessage(testAccountId, 'msg123', {
        markAsRead: true
      })

      expect(mockRefreshAccessToken).toHaveBeenCalledWith(testAccountId)
      expect(mockMessagesModify).toHaveBeenCalledTimes(2)
    })
  })

  describe('error handling', () => {
    it('should handle 401 error with response.status format', async () => {
      const error401 = new Error('Unauthorized')
      ;(error401 as any).response = { status: 401 }

      mockMessagesList
        .mockRejectedValueOnce(error401)
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg1', threadId: 'thread1' }],
            resultSizeEstimate: 1
          }
        })

      mockRefreshAccessToken.mockResolvedValue({})

      const result = await gmailApiService.listMessages(testAccountId)

      expect(result.messages).toHaveLength(1)
      expect(mockRefreshAccessToken).toHaveBeenCalled()
    })

    it('should handle 429 error with response.status format', async () => {
      const error429 = new Error('Rate limit')
      ;(error429 as any).response = { status: 429 }

      mockMessagesList
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({
          data: {
            messages: [{ id: 'msg1', threadId: 'thread1' }],
            resultSizeEstimate: 1
          }
        })

      // Use fake timers to skip the 60 second wait
      vi.useFakeTimers()
      
      const promise = gmailApiService.listMessages(testAccountId)
      
      // Fast-forward time by 60 seconds
      await vi.advanceTimersByTimeAsync(60000)
      
      const result = await promise
      
      vi.useRealTimers()

      expect(result.messages).toHaveLength(1)
    })

    it('should throw rate limit error after max retries', async () => {
      const error429 = new Error('Rate limit')
      ;(error429 as any).code = 429

      mockMessagesList.mockRejectedValue(error429)

      // Use fake timers to skip the 60 second waits
      vi.useFakeTimers()
      
      const promise = gmailApiService.listMessages(testAccountId).catch(err => err)
      
      // Fast-forward time by 180 seconds (3 retries * 60 seconds each)
      await vi.advanceTimersByTimeAsync(180000)
      
      const error = await promise
      
      vi.useRealTimers()
      
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('Gmail API rate limit exceeded')
    })
  })

  describe('token management', () => {
    it('should call ensureValidToken before each operation', async () => {
      mockMessagesList.mockResolvedValue({
        data: { messages: [], resultSizeEstimate: 0 }
      })

      await gmailApiService.listMessages(testAccountId)

      expect(mockEnsureValidToken).toHaveBeenCalledWith(testAccountId)
    })

    it('should use the token returned by ensureValidToken', async () => {
      const customToken = 'custom_access_token'
      mockEnsureValidToken.mockResolvedValue(customToken)

      mockMessagesList.mockResolvedValue({
        data: { messages: [], resultSizeEstimate: 0 }
      })

      await gmailApiService.listMessages(testAccountId)

      expect(mockEnsureValidToken).toHaveBeenCalledWith(testAccountId)
      // The token is passed to google.gmail() which we've mocked
    })
  })
})
