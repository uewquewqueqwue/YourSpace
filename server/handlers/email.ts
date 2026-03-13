import { ipcMain } from 'electron'
import { authenticate } from '../middleware/auth'
import { accountManager } from '../services/AccountManager'
import { syncService } from '../services/SyncService'
import { emailRepository } from '../repositories/EmailRepository'
import { oauthService } from '../services/OAuthService'
import { gmailApiService } from '../services/GmailApiService'
import { handleError } from '../utils/errors'
import { rateLimit } from '../utils/rateLimit'
import logger from '../utils/logger'

/**
 * Email IPC Handlers
 * 
 * Exposes email operations to the frontend via Electron IPC
 * All handlers validate JWT tokens and call appropriate services
 * 
 * Requirements: 1.1, 2.4, 2.5, 3.2, 5.1, 7.1, 7.2, 8.1
 * 
 * Handlers:
 * - email:accounts:connect - Initiate OAuth flow for new account
 * - email:accounts:callback - Handle OAuth callback
 * - email:accounts:list - List all connected accounts with email counts
 * - email:accounts:disconnect - Remove account and associated emails
 * - email:sync:trigger - Manually trigger sync for all accounts
 * - email:list - Fetch emails with filters (account, read status, pagination)
 * - email:markRead - Update read status of an email
 * - email:search - Search emails across subject, sender, preview
 */

export function setupEmailHandlers() {
  /**
   * Initiates OAuth flow to connect a new Google account
   * 
   * Requirements: 1.1, 2.1, 2.3
   * 
   * @param token - User JWT token
   * @returns Authorization URL and state token
   */
  ipcMain.handle('email:accounts:connect', async (event, { token }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // Rate limit: 10 connection attempts per hour per user
      rateLimit(`email:connect:${user.id}`, 10, 3600000)

      // Generate OAuth URL
      const { authUrl, state } = await accountManager.connectAccount(user.id)

      logger.info(`Generated OAuth URL for user ${user.id}`)

      return {
        success: true,
        authUrl,
        state
      }
    } catch (error) {
      logger.error('email:accounts:connect failed:', error)
      handleError(error, 'email:accounts:connect')
    }
  })

  /**
   * Handles OAuth callback after user authorizes
   * 
   * Requirements: 1.2, 2.2
   * 
   * @param code - Authorization code from Google
   * @param state - State token for CSRF validation
   * @returns Created account details
   */
  ipcMain.handle('email:accounts:callback', async (event, { code, state }) => {
    try {
      // Exchange code for tokens and create account
      const account = await oauthService.handleCallback(code, state)

      logger.info(`OAuth callback successful for account ${account.id}`)

      // Trigger initial sync in background
      syncService.syncAccount(account.id).catch(error => {
        logger.error(`Initial sync failed for account ${account.id}:`, error)
      })

      return {
        success: true,
        account: {
          id: account.id,
          email: account.email,
          lastSyncAt: account.lastSyncAt,
          syncStatus: account.syncStatus
        }
      }
    } catch (error) {
      logger.error('email:accounts:callback failed:', error)
      handleError(error, 'email:accounts:callback')
    }
  })

  /**
   * Lists all connected Google accounts for the authenticated user
   * 
   * Requirements: 2.4, 6.2, 6.4
   * 
   * @param token - User JWT token
   * @returns Array of accounts with email counts
   */
  ipcMain.handle('email:accounts:list', async (event, { token }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // Get accounts with email counts
      const accounts = await accountManager.listAccounts(user.id)

      logger.debug(`Listed ${accounts.length} accounts for user ${user.id}`)

      return {
        success: true,
        accounts
      }
    } catch (error) {
      logger.error('email:accounts:list failed:', error)
      handleError(error, 'email:accounts:list')
    }
  })

  /**
   * Disconnects a Google account and deletes all associated emails
   * 
   * Requirements: 2.5, 4.5
   * 
   * @param token - User JWT token
   * @param accountId - Google account ID to disconnect
   * @returns Number of emails deleted
   */
  ipcMain.handle('email:accounts:disconnect', async (event, { token, accountId }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // Verify account belongs to user
      const account = await accountManager.getAccount(accountId)
      if (!account || account.userId !== user.id) {
        throw new Error('Account not found or access denied')
      }

      // Disconnect account
      const { emailsDeleted } = await accountManager.disconnectAccount(accountId)

      logger.info(`Disconnected account ${accountId} for user ${user.id}, deleted ${emailsDeleted} emails`)

      return {
        success: true,
        emailsDeleted
      }
    } catch (error) {
      logger.error('email:accounts:disconnect failed:', error)
      handleError(error, 'email:accounts:disconnect')
    }
  })

  /**
   * Manually triggers synchronization for all connected accounts
   * 
   * Requirements: 3.2
   * 
   * @param token - User JWT token
   * @returns Sync results for all accounts
   */
  ipcMain.handle('email:sync:trigger', async (event, { token }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // Rate limit: 5 manual syncs per minute per user
      rateLimit(`email:sync:${user.id}`, 5, 60000)

      logger.info(`Manual sync triggered by user ${user.id}`)

      // Get user's accounts
      const accounts = await accountManager.listAccounts(user.id)
      const accountIds = accounts.map(a => a.id)

      // Trigger sync for each account
      const results = []
      for (const accountId of accountIds) {
        try {
          const result = await syncService.syncAccount(accountId)
          results.push(result)
        } catch (error) {
          logger.error(`Sync failed for account ${accountId}:`, error)
          results.push({
            accountId,
            accountEmail: '',
            newEmails: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            success: false
          })
        }
      }

      logger.info(`Manual sync completed for user ${user.id}: ${results.length} accounts processed`)

      return {
        success: true,
        results
      }
    } catch (error) {
      logger.error('email:sync:trigger failed:', error)
      handleError(error, 'email:sync:trigger')
    }
  })

  /**
   * Lists emails with filters (account, read status, pagination)
   * 
   * Requirements: 5.1, 6.3
   * 
   * @param token - User JWT token
   * @param accountId - Optional account filter
   * @param isRead - Optional read status filter
   * @param limit - Number of emails to fetch (default 50)
   * @param offset - Pagination offset (default 0)
   * @returns Emails and pagination info
   */
  ipcMain.handle('email:list', async (event, { token, accountId, isRead, limit = 50, offset = 0 }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // If accountId provided, verify it belongs to user
      if (accountId) {
        const account = await accountManager.getAccount(accountId)
        if (!account || account.userId !== user.id) {
          throw new Error('Account not found or access denied')
        }
      }

      // Get user's account IDs if no specific account filter
      let accountFilter = accountId
      if (!accountFilter) {
        const accounts = await accountManager.listAccounts(user.id)
        // If user has no accounts, return empty list
        if (accounts.length === 0) {
          return {
            success: true,
            emails: [],
            total: 0,
            hasMore: false
          }
        }
      }

      // Fetch emails with filters
      const { emails, total } = await emailRepository.listEmails({
        accountId: accountFilter,
        isRead,
        limit,
        offset
      })

      // Transform to DTO format
      const emailDTOs = emails.map(email => ({
        id: email.id,
        accountId: email.accountId,
        subject: email.subject,
        sender: email.sender,
        recipient: email.recipient,
        preview: email.preview,
        isRead: email.isRead,
        timestamp: email.timestamp
      }))

      const hasMore = offset + emails.length < total

      logger.debug(`Listed ${emails.length} emails for user ${user.id} (total: ${total})`)

      return {
        success: true,
        emails: emailDTOs,
        total,
        hasMore
      }
    } catch (error) {
      logger.error('email:list failed:', error)
      handleError(error, 'email:list')
    }
  })

  /**
   * Updates read status of an email
   * 
   * Requirements: 7.1, 7.2
   * 
   * @param token - User JWT token
   * @param emailId - Email ID to update
   * @param isRead - New read status
   * @returns Updated email
   */
  ipcMain.handle('email:markRead', async (event, { token, emailId, isRead }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // Get email to verify ownership (emailId is database ID, not gmailId)
      const email = await emailRepository.findById(emailId)
      if (!email) {
        throw new Error('Email not found')
      }

      // Verify email belongs to user's account
      const account = await accountManager.getAccount(email.accountId)
      if (!account || account.userId !== user.id) {
        throw new Error('Email not found or access denied')
      }

      // Update read status in database
      const updatedEmail = await emailRepository.updateReadStatus(email.id, isRead)

      // Sync with Gmail API in background (don't wait)
      gmailApiService.modifyMessage(email.accountId, email.gmailId, { markAsRead: isRead })
        .catch(error => {
          logger.error(`Failed to sync read status with Gmail for email ${email.id}:`, error)
        })

      logger.debug(`Updated read status for email ${email.id}: ${isRead}`)

      return {
        success: true,
        email: {
          id: updatedEmail.id,
          accountId: updatedEmail.accountId,
          subject: updatedEmail.subject,
          sender: updatedEmail.sender,
          recipient: updatedEmail.recipient,
          preview: updatedEmail.preview,
          isRead: updatedEmail.isRead,
          timestamp: updatedEmail.timestamp
        }
      }
    } catch (error) {
      logger.error('email:markRead failed:', error)
      handleError(error, 'email:markRead')
    }
  })

  /**
   * Searches emails across subject, sender, and preview text
   * 
   * Requirements: 8.1
   * 
   * @param token - User JWT token
   * @param query - Search query string
   * @param accountId - Optional account filter
   * @param limit - Maximum results (default 50)
   * @returns Matching emails
   */
  ipcMain.handle('email:search', async (event, { token, query, accountId, limit = 50 }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // Rate limit: 20 searches per minute per user
      rateLimit(`email:search:${user.id}`, 20, 60000)

      // If accountId provided, verify it belongs to user
      if (accountId) {
        const account = await accountManager.getAccount(accountId)
        if (!account || account.userId !== user.id) {
          throw new Error('Account not found or access denied')
        }
      }

      // If no query, return empty results
      if (!query || query.trim().length === 0) {
        return {
          success: true,
          emails: []
        }
      }

      // Search emails
      const emails = await emailRepository.searchEmails(query.trim(), {
        accountId,
        limit
      })

      // Transform to DTO format
      const emailDTOs = emails.map(email => ({
        id: email.id,
        accountId: email.accountId,
        subject: email.subject,
        sender: email.sender,
        recipient: email.recipient,
        preview: email.preview,
        isRead: email.isRead,
        timestamp: email.timestamp
      }))

      logger.debug(`Search for "${query}" returned ${emails.length} results for user ${user.id}`)

      return {
        success: true,
        emails: emailDTOs
      }
    } catch (error) {
      logger.error('email:search failed:', error)
      handleError(error, 'email:search')
    }
  })

  /**
   * Gets unread email count for the authenticated user
   * 
   * @param token - User JWT token
   * @returns Total unread count across all accounts
   */
  ipcMain.handle('email:unreadCount', async (event, { token }) => {
    try {
      // Validate JWT token
      const user = await authenticate(token)

      // Get user's accounts
      const accounts = await accountManager.listAccounts(user.id)
      if (accounts.length === 0) {
        return {
          success: true,
          count: 0
        }
      }

      // Count unread emails across all accounts
      const count = await emailRepository.countUnread(accounts.map(a => a.id))

      return {
        success: true,
        count
      }
    } catch (error) {
      logger.error('email:unreadCount failed:', error)
      handleError(error, 'email:unreadCount')
    }
  })

  logger.info('Email IPC handlers registered')
}
