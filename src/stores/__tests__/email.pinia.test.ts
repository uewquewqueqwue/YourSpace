import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEmailStore } from '../email.pinia'
import type { 
  ConnectAccountResponse,
  ListAccountsResponse,
  ListEmailsResponse,
  MarkReadResponse,
  SearchEmailsResponse,
  TriggerSyncResponse,
  DisconnectAccountResponse
} from '@/types/email'

// Mock window.electronAPI
const mockElectronAPI = {
  email: {
    accounts: {
      connect: vi.fn(),
      callback: vi.fn(),
      list: vi.fn(),
      disconnect: vi.fn()
    },
    sync: {
      trigger: vi.fn()
    },
    list: vi.fn(),
    markRead: vi.fn(),
    search: vi.fn(),
    unreadCount: vi.fn()
  },
  openExternal: vi.fn()
}

global.window = {
  electronAPI: mockElectronAPI
} as any

describe('Email Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({ id: '1', email: 'test@example.com' }))
  })

  describe('State Management', () => {
    it('should initialize with empty state', () => {
      const store = useEmailStore()
      
      expect(store.emails).toEqual([])
      expect(store.accounts).toEqual([])
      expect(store.selectedAccountId).toBeNull()
      expect(store.showRead).toBeNull()
      expect(store.searchQuery).toBe('')
      expect(store.loading).toBe(false)
      expect(store.syncing).toBe(false)
      expect(store.error).toBeNull()
      expect(store.total).toBe(0)
      expect(store.hasMore).toBe(false)
    })

    it('should check authentication status', () => {
      localStorage.setItem('token', 'test-token')
      localStorage.setItem('user', JSON.stringify({ id: '1', email: 'test@example.com' }))
      
      const store = useEmailStore()
      expect(store.isAuthenticated).toBe(true)
    })
  })

  describe('Account Management', () => {
    it('should connect account', async () => {
      const store = useEmailStore()
      const mockResponse: ConnectAccountResponse = {
        success: true,
        authUrl: 'https://accounts.google.com/oauth',
        state: 'test-state',
        codeVerifier: 'test-verifier'
      }
      
      mockElectronAPI.email.accounts.connect.mockResolvedValue(mockResponse)
      mockElectronAPI.openExternal.mockResolvedValue(undefined)
      
      await store.connectAccount()
      
      expect(mockElectronAPI.email.accounts.connect).toHaveBeenCalledWith('test-token')
      expect(mockElectronAPI.openExternal).toHaveBeenCalledWith('https://accounts.google.com/oauth')
    })

    it('should load accounts', async () => {
      const store = useEmailStore()
      const mockResponse: ListAccountsResponse = {
        success: true,
        accounts: [
          {
            id: 'acc1',
            email: 'user1@gmail.com',
            lastSyncAt: '2024-01-01T00:00:00Z',
            syncStatus: 'IDLE',
            emailCount: 10
          },
          {
            id: 'acc2',
            email: 'user2@gmail.com',
            lastSyncAt: null,
            syncStatus: 'IDLE',
            emailCount: 5
          }
        ]
      }
      
      mockElectronAPI.email.accounts.list.mockResolvedValue(mockResponse)
      
      await store.loadAccounts()
      
      expect(store.accounts).toHaveLength(2)
      expect(store.accounts[0].email).toBe('user1@gmail.com')
      expect(store.accounts[0].emailCount).toBe(10)
      expect(store.accounts[1].lastSyncAt).toBeNull()
    })

    it('should disconnect account', async () => {
      const store = useEmailStore()
      
      // Setup initial state
      store.accounts = [
        {
          id: 'acc1',
          email: 'user1@gmail.com',
          lastSyncAt: new Date(),
          syncStatus: 'IDLE',
          emailCount: 10
        }
      ]
      store.emails = [
        {
          id: 'email1',
          accountId: 'acc1',
          subject: 'Test',
          sender: 'sender@example.com',
          recipient: 'user1@gmail.com',
          preview: 'Test preview',
          isRead: false,
          timestamp: new Date()
        }
      ]
      store.selectedAccountId = 'acc1'
      
      const mockResponse: DisconnectAccountResponse = {
        success: true,
        emailsDeleted: 10
      }
      
      mockElectronAPI.email.accounts.disconnect.mockResolvedValue(mockResponse)
      
      await store.disconnectAccount('acc1')
      
      expect(store.accounts).toHaveLength(0)
      expect(store.emails).toHaveLength(0)
      expect(store.selectedAccountId).toBeNull()
    })
  })

  describe('Email Loading', () => {
    it('should load emails', async () => {
      const store = useEmailStore()
      const mockResponse: ListEmailsResponse = {
        success: true,
        emails: [
          {
            id: 'email1',
            accountId: 'acc1',
            subject: 'Test Email',
            sender: 'sender@example.com',
            recipient: 'user@gmail.com',
            preview: 'This is a test email',
            isRead: false,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1,
        hasMore: false
      }
      
      mockElectronAPI.email.list.mockResolvedValue(mockResponse)
      
      await store.loadEmails(0)
      
      expect(store.emails).toHaveLength(1)
      expect(store.emails[0].subject).toBe('Test Email')
      expect(store.total).toBe(1)
      expect(store.hasMore).toBe(false)
    })

    it('should append emails on pagination', async () => {
      const store = useEmailStore()
      
      // Initial load
      store.emails = [
        {
          id: 'email1',
          accountId: 'acc1',
          subject: 'Email 1',
          sender: 'sender@example.com',
          recipient: 'user@gmail.com',
          preview: 'Preview 1',
          isRead: false,
          timestamp: new Date()
        }
      ]
      
      const mockResponse: ListEmailsResponse = {
        success: true,
        emails: [
          {
            id: 'email2',
            accountId: 'acc1',
            subject: 'Email 2',
            sender: 'sender@example.com',
            recipient: 'user@gmail.com',
            preview: 'Preview 2',
            isRead: false,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ],
        total: 2,
        hasMore: false
      }
      
      mockElectronAPI.email.list.mockResolvedValue(mockResponse)
      
      await store.loadEmails(1)
      
      expect(store.emails).toHaveLength(2)
      expect(store.emails[1].subject).toBe('Email 2')
    })
  })

  describe('Read Status', () => {
    it('should mark email as read', async () => {
      const store = useEmailStore()
      
      store.emails = [
        {
          id: 'email1',
          accountId: 'acc1',
          subject: 'Test',
          sender: 'sender@example.com',
          recipient: 'user@gmail.com',
          preview: 'Preview',
          isRead: false,
          timestamp: new Date()
        }
      ]
      
      const mockResponse: MarkReadResponse = {
        success: true,
        email: {
          id: 'email1',
          accountId: 'acc1',
          subject: 'Test',
          sender: 'sender@example.com',
          recipient: 'user@gmail.com',
          preview: 'Preview',
          isRead: true,
          timestamp: '2024-01-01T00:00:00Z'
        }
      }
      
      mockElectronAPI.email.markRead.mockResolvedValue(mockResponse)
      mockElectronAPI.email.unreadCount.mockResolvedValue({ success: true, count: 0 })
      
      await store.markAsRead('email1', true)
      
      expect(store.emails[0].isRead).toBe(true)
    })
  })

  describe('Search', () => {
    it('should search emails', async () => {
      const store = useEmailStore()
      const mockResponse: SearchEmailsResponse = {
        success: true,
        emails: [
          {
            id: 'email1',
            accountId: 'acc1',
            subject: 'Important Email',
            sender: 'sender@example.com',
            recipient: 'user@gmail.com',
            preview: 'This is important',
            isRead: false,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ]
      }
      
      mockElectronAPI.email.search.mockResolvedValue(mockResponse)
      
      await store.searchEmails('important')
      
      expect(store.searchQuery).toBe('important')
      // Note: debounced function will be called after 300ms
    })
  })

  describe('Filters', () => {
    it('should set account filter', async () => {
      const store = useEmailStore()
      
      mockElectronAPI.email.list.mockResolvedValue({
        success: true,
        emails: [],
        total: 0,
        hasMore: false
      })
      
      store.setAccountFilter('acc1')
      
      expect(store.selectedAccountId).toBe('acc1')
    })

    it('should set read filter', async () => {
      const store = useEmailStore()
      
      mockElectronAPI.email.list.mockResolvedValue({
        success: true,
        emails: [],
        total: 0,
        hasMore: false
      })
      
      store.setReadFilter(true)
      
      expect(store.showRead).toBe(true)
    })

    it('should compute filtered emails', async () => {
      const store = useEmailStore()
      
      // Mock list response with filtered data (server-side filtering)
      const mockListResponse: ListEmailsResponse = {
        success: true,
        emails: [
          {
            id: 'email1',
            accountId: 'acc1',
            subject: 'Test 1',
            sender: 'sender1@example.com',
            recipient: 'user@gmail.com',
            preview: 'Preview 1',
            isRead: false,
            timestamp: '2024-01-01T00:00:00Z'
          }
        ],
        total: 1,
        hasMore: false
      }
      
      mockElectronAPI.email.list.mockResolvedValue(mockListResponse)
      
      // Filter by account - server does the filtering
      store.setAccountFilter('acc1')
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(store.filteredEmails).toHaveLength(1)
      expect(store.filteredEmails[0].accountId).toBe('acc1')
      
      // Verify server was called with correct filter
      expect(mockElectronAPI.email.list).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          accountId: 'acc1'
        })
      )
    })

    it('should return empty array when emails is undefined', () => {
      const store = useEmailStore()
      
      // Force emails to be undefined (edge case)
      store.emails = undefined as any
      
      // Should return empty array, not undefined
      expect(store.filteredEmails).toEqual([])
      expect(Array.isArray(store.filteredEmails)).toBe(true)
    })

    it('should compute account options', () => {
      const store = useEmailStore()
      
      store.accounts = [
        {
          id: 'acc1',
          email: 'user1@gmail.com',
          lastSyncAt: new Date(),
          syncStatus: 'IDLE',
          emailCount: 10
        },
        {
          id: 'acc2',
          email: 'user2@gmail.com',
          lastSyncAt: null,
          syncStatus: 'IDLE',
          emailCount: 5
        }
      ]
      
      const options = store.accountOptions
      
      expect(options).toHaveLength(2)
      expect(options[0]).toEqual({
        id: 'acc1',
        email: 'user1@gmail.com',
        count: 10
      })
      expect(options[1]).toEqual({
        id: 'acc2',
        email: 'user2@gmail.com',
        count: 5
      })
    })
  })

  describe('Sync', () => {
    it('should trigger manual sync', async () => {
      const store = useEmailStore()
      
      const mockSyncResponse: TriggerSyncResponse = {
        success: true,
        results: [
          {
            accountId: 'acc1',
            accountEmail: 'user@gmail.com',
            newEmails: 5,
            errors: [],
            success: true
          }
        ]
      }
      
      const mockListResponse: ListEmailsResponse = {
        success: true,
        emails: [],
        total: 0,
        hasMore: false
      }
      
      const mockAccountsResponse: ListAccountsResponse = {
        success: true,
        accounts: []
      }
      
      mockElectronAPI.email.sync.trigger.mockResolvedValue(mockSyncResponse)
      mockElectronAPI.email.list.mockResolvedValue(mockListResponse)
      mockElectronAPI.email.accounts.list.mockResolvedValue(mockAccountsResponse)
      mockElectronAPI.email.unreadCount.mockResolvedValue({ success: true, count: 0 })
      
      await store.triggerSync()
      
      expect(mockElectronAPI.email.sync.trigger).toHaveBeenCalledWith('test-token')
      expect(mockElectronAPI.email.list).toHaveBeenCalled()
      expect(mockElectronAPI.email.accounts.list).toHaveBeenCalled()
      expect(mockElectronAPI.email.unreadCount).toHaveBeenCalled()
    })
  })

  describe('Lifecycle', () => {
    it('should reset store', () => {
      const store = useEmailStore()
      
      store.emails = [{ id: 'email1' } as any]
      store.accounts = [{ id: 'acc1' } as any]
      store.selectedAccountId = 'acc1'
      store.error = 'Some error'
      
      store.reset()
      
      expect(store.emails).toEqual([])
      expect(store.accounts).toEqual([])
      expect(store.selectedAccountId).toBeNull()
      expect(store.error).toBeNull()
    })

    it('should logout', () => {
      const store = useEmailStore()
      
      store.emails = [{ id: 'email1' } as any]
      store.accounts = [{ id: 'acc1' } as any]
      
      store.logout()
      
      expect(store.emails).toEqual([])
      expect(store.accounts).toEqual([])
    })
  })
})
