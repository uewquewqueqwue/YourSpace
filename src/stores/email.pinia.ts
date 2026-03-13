import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  EmailDTO,
  AccountDTO,
  EmailState,
  EmailResponse,
  AccountResponse
} from '@/types/email'
import { debounce } from 'lodash-es'

/**
 * Email Store - Pinia
 * 
 * Manages email state and communicates with backend via IPC
 * 
 * Requirements: 2.4, 5.1, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 8.2, 8.3
 * 
 * Features:
 * - Account management (connect, disconnect, list)
 * - Email loading with pagination
 * - Filtering by account and read status
 * - Search with 300ms debounce
 * - Manual sync trigger
 * - Read/unread status management
 */

const EMAILS_PER_PAGE = 50

export const useEmailStore = defineStore('email', () => {
  // State
  const emails = ref<EmailDTO[]>([])
  const accounts = ref<AccountDTO[]>([])
  const selectedAccountId = ref<string | null>(null)
  const showRead = ref<boolean | null>(null) // null = all, true = read, false = unread
  const searchQuery = ref<string>('')
  const loading = ref(false)
  const syncing = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const hasMore = ref(false)
  const unreadCount = ref(0) // Real unread count from database
  const recentEmails = ref<EmailDTO[]>([]) // Last 20 emails for RightPanel

  // Getters
  const isAuthenticated = computed(() => {
    return !!localStorage.getItem('token') && !!localStorage.getItem('user')
  })

  const getToken = (): string | null => localStorage.getItem('token')

  /**
   * Filtered emails based on current filters
   * Requirements: 6.3
   * 
   * NOTE: Filtering is done on server side via loadEmails()
   * This computed just returns emails as-is for backward compatibility
   */
  const filteredEmails = computed(() => {
    // Ensure we always return an array, never undefined
    return emails.value || []
  })

  /**
   * Account options with email counts
   * Requirements: 6.2, 6.4
   */
  const accountOptions = computed(() => {
    return accounts.value.map(account => ({
      id: account.id,
      email: account.email,
      count: account.emailCount
    }))
  })

  // Helper functions
  const convertEmailResponse = (email: EmailResponse): EmailDTO => ({
    ...email,
    timestamp: new Date(email.timestamp)
  })

  const convertAccountResponse = (account: AccountResponse): AccountDTO => ({
    ...account,
    lastSyncAt: account.lastSyncAt ? new Date(account.lastSyncAt) : null
  })

  /**
   * Connect a new Google account via OAuth
   * Requirements: 2.4
   */
  const connectAccount = async (): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      throw new Error('Not authenticated')
    }

    try {
      loading.value = true
      error.value = null

      const response = await window.electronAPI.email.accounts.connect(token)
      
      if (response.success && response.authUrl) {
        // Open OAuth URL in system browser using shell.openExternal
        // This is handled by Electron's shell module
        await window.electronAPI.openExternal(response.authUrl)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to connect account'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Disconnect a Google account
   * Requirements: 2.4
   */
  const disconnectAccount = async (accountId: string): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      throw new Error('Not authenticated')
    }

    try {
      loading.value = true
      error.value = null

      const response = await window.electronAPI.email.accounts.disconnect(token, accountId)
      
      if (response.success) {
        // Remove account from local state
        accounts.value = accounts.value.filter(a => a.id !== accountId)
        
        // Remove emails from disconnected account
        emails.value = emails.value.filter(e => e.accountId !== accountId)
        
        // Clear filter if disconnected account was selected
        if (selectedAccountId.value === accountId) {
          selectedAccountId.value = null
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to disconnect account'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Load emails with pagination
   * Requirements: 5.1
   */
  const loadEmails = async (offset: number = 0): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      return
    }

    try {
      loading.value = true
      error.value = null

      const response = await window.electronAPI.email.list(token, {
        accountId: selectedAccountId.value || undefined,
        isRead: showRead.value !== null ? showRead.value : undefined,
        limit: EMAILS_PER_PAGE,
        offset
      })

      if (response.success) {
        const newEmails = response.emails.map(convertEmailResponse)
        
        if (offset === 0) {
          // Replace emails on initial load
          emails.value = newEmails
        } else {
          // Append emails on pagination
          emails.value = [...emails.value, ...newEmails]
        }
        
        total.value = response.total
        hasMore.value = response.hasMore
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load emails'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark email as read or unread
   * Requirements: 7.1, 7.2
   */
  const markAsRead = async (emailId: string, isRead: boolean): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      throw new Error('Not authenticated')
    }

    try {
      // Optimistically update UI
      const email = emails.value.find(e => e.id === emailId)
      const recentEmail = recentEmails.value.find(e => e.id === emailId)
      const wasRead = email?.isRead
      
      if (email) {
        email.isRead = isRead
      }
      if (recentEmail) {
        recentEmail.isRead = isRead
      }
      
      // Update unread count optimistically
      if (wasRead !== undefined && wasRead !== isRead) {
        unreadCount.value += isRead ? -1 : 1
      }

      const response = await window.electronAPI.email.markRead(token, emailId, isRead)
      
      if (response.success) {
        // Update with server response
        const updatedEmail = convertEmailResponse(response.email)
        const index = emails.value.findIndex(e => e.id === emailId)
        if (index !== -1) {
          emails.value[index] = updatedEmail
        }
        const recentIndex = recentEmails.value.findIndex(e => e.id === emailId)
        if (recentIndex !== -1) {
          recentEmails.value[recentIndex] = updatedEmail
        }
        
        // Reload unread count to ensure accuracy
        await loadUnreadCount()
      }
    } catch (err) {
      // Revert optimistic update on error
      const email = emails.value.find(e => e.id === emailId)
      const recentEmail = recentEmails.value.find(e => e.id === emailId)
      if (email) {
        email.isRead = !isRead
      }
      if (recentEmail) {
        recentEmail.isRead = !isRead
      }
      
      // Revert unread count
      unreadCount.value += isRead ? 1 : -1
      
      error.value = err instanceof Error ? err.message : 'Failed to update read status'
      throw err
    }
  }

  /**
   * Search emails with 300ms debounce
   * Requirements: 8.2, 8.3
   */
  const searchEmailsDebounced = debounce(async (query: string) => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      return
    }

    try {
      loading.value = true
      error.value = null

      if (!query.trim()) {
        // If query is empty, reload emails with current filters
        await loadEmails(0)
        return
      }

      const response = await window.electronAPI.email.search(token, query, {
        accountId: selectedAccountId.value || undefined,
        limit: 100
      })

      if (response.success) {
        emails.value = response.emails.map(convertEmailResponse)
        total.value = response.emails.length
        hasMore.value = false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Search failed'
      throw err
    } finally {
      loading.value = false
    }
  }, 300)

  const searchEmails = async (query: string): Promise<void> => {
    searchQuery.value = query
    await searchEmailsDebounced(query)
  }

  /**
   * Trigger manual sync for all accounts
   * Requirements: 6.5
   */
  const triggerSync = async (): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      throw new Error('Not authenticated')
    }

    try {
      syncing.value = true
      error.value = null

      const response = await window.electronAPI.email.sync.trigger(token)
      
      if (response.success) {
        // Reload everything after sync
        await Promise.all([
          loadEmails(0),
          loadAccounts(),
          loadUnreadCount(),
          loadRecentEmails()
        ])
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Sync failed'
      throw err
    } finally {
      syncing.value = false
    }
  }

  /**
   * Set account filter
   * Requirements: 6.1, 6.3
   */
  const setAccountFilter = (accountId: string | null): void => {
    selectedAccountId.value = accountId
    // Reload emails with new filter
    loadEmails(0)
  }

  /**
   * Set read status filter
   * Requirements: 6.1
   */
  const setReadFilter = (showReadStatus: boolean | null): void => {
    showRead.value = showReadStatus
    // Reload emails with new filter
    loadEmails(0)
  }

  /**
   * Load connected accounts
   * Requirements: 2.4, 6.2
   */
  const loadAccounts = async (): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      return
    }

    try {
      const response = await window.electronAPI.email.accounts.list(token)
      
      if (response.success) {
        accounts.value = response.accounts.map(convertAccountResponse)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load accounts'
      throw err
    }
  }

  /**
   * Load unread count from database
   */
  const loadUnreadCount = async (): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      return
    }

    try {
      const response = await window.electronAPI.email.unreadCount(token)
      
      if (response.success) {
        unreadCount.value = response.count
      }
    } catch (err) {
      console.error('Failed to load unread count:', err)
    }
  }

  /**
   * Load recent 20 emails for RightPanel
   */
  const loadRecentEmails = async (): Promise<void> => {
    const token = getToken()
    if (!token || !isAuthenticated.value) {
      return
    }

    try {
      const response = await window.electronAPI.email.list(token, {
        limit: 20,
        offset: 0
      })

      if (response.success) {
        recentEmails.value = response.emails.map(convertEmailResponse)
      }
    } catch (err) {
      console.error('Failed to load recent emails:', err)
    }
  }

  /**
   * Initialize store - load accounts and emails
   */
  const initialize = async (): Promise<void> => {
    if (!isAuthenticated.value) {
      return
    }

    try {
      await Promise.all([
        loadAccounts(),
        loadEmails(0),
        loadUnreadCount(),
        loadRecentEmails()
      ])
    } catch (err) {
      console.error('Failed to initialize email store:', err)
    }
  }

  /**
   * Reset store state
   */
  const reset = (): void => {
    emails.value = []
    accounts.value = []
    selectedAccountId.value = null
    showRead.value = null
    searchQuery.value = ''
    loading.value = false
    syncing.value = false
    error.value = null
    total.value = 0
    hasMore.value = false
    unreadCount.value = 0
    recentEmails.value = []
  }

  /**
   * Cleanup on logout
   */
  const logout = (): void => {
    reset()
  }

  return {
    // State
    emails,
    accounts,
    selectedAccountId,
    showRead,
    searchQuery,
    loading,
    syncing,
    error,
    total,
    hasMore,
    unreadCount,
    recentEmails,
    
    // Getters
    isAuthenticated,
    filteredEmails,
    accountOptions,
    
    // Actions
    connectAccount,
    disconnectAccount,
    loadEmails,
    markAsRead,
    searchEmails,
    triggerSync,
    setAccountFilter,
    setReadFilter,
    loadAccounts,
    loadUnreadCount,
    loadRecentEmails,
    initialize,
    reset,
    logout
  }
})

// Export for initialization
export const initializeEmailStore = async () => {
  const store = useEmailStore()
  await store.initialize()
}
