import { prisma } from '../prisma'
import { gmailApiService } from './GmailApiService'
import { emailRepository } from '../repositories/EmailRepository'
import logger from '../utils/logger'
import type { GoogleAccount } from '@prisma/client'

/**
 * SyncService handles background email synchronization from Gmail
 * 
 * Features:
 * - Initial sync: Fetch last 100 emails for new accounts
 * - Incremental sync: Fetch only new emails since lastSyncAt
 * - Status updates: IDLE → SYNCING → IDLE/ERROR
 * - Error handling: Log errors and retry after 1 minute
 * - Sequential processing: Process accounts one at a time to avoid rate limits
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * @example
 * ```typescript
 * const syncService = new SyncService()
 * 
 * // Sync a single account
 * const result = await syncService.syncAccount('account123')
 * 
 * // Sync all accounts
 * await syncService.syncAllAccounts()
 * 
 * // Start background scheduler (every 5 minutes)
 * syncService.startScheduler()
 * ```
 */

export interface SyncResult {
  accountId: string
  accountEmail: string
  newEmails: number
  errors: string[]
  success: boolean
}

export class SyncService {
  private schedulerInterval: NodeJS.Timeout | null = null
  private readonly SYNC_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes (reduced frequency)
  private readonly RETRY_DELAY_MS = 60 * 1000 // 1 minute

  /**
   * Performs initial sync for a newly connected account
   * Fetches the last 100 emails (or all if fewer than 100)
   * 
   * Requirements: 3.1
   * 
   * @param accountId - Google account ID
   * @returns Sync result with count of fetched emails
   */
  async initialSync(accountId: string): Promise<SyncResult> {
    logger.info(`Starting initial sync for account ${accountId}`)

    const result: SyncResult = {
      accountId,
      accountEmail: '',
      newEmails: 0,
      errors: [],
      success: false
    }

    try {
      // Get account details
      const account = await prisma.googleAccount.findUnique({
        where: { id: accountId }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      result.accountEmail = account.email

      // Update status to SYNCING
      await this.updateSyncStatus(accountId, 'SYNCING')

      // Fetch last 100 messages from Gmail
      const { messages } = await gmailApiService.listMessages(accountId, {
        maxResults: 100
      })

      logger.info(`Found ${messages.length} messages for initial sync of account ${accountId}`)

      // Fetch and store messages in parallel batches of 10 to avoid overwhelming the API
      const BATCH_SIZE = 10
      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE)
        
        await Promise.allSettled(
          batch.map(async (message) => {
            try {
              await this.fetchAndStoreMessage(accountId, account.email, message.id)
              result.newEmails++
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error'
              logger.error(`Failed to fetch message ${message.id}:`, error)
              result.errors.push(`Message ${message.id}: ${errorMsg}`)
            }
          })
        )
        
        logger.debug(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(messages.length / BATCH_SIZE)} for account ${accountId}`)
      }

      // Update lastSyncAt and status to IDLE
      await prisma.googleAccount.update({
        where: { id: accountId },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'IDLE'
        }
      })

      result.success = true
      logger.info(`Initial sync completed for account ${accountId}: ${result.newEmails} emails fetched`)

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Initial sync failed for account ${accountId}:`, error)
      result.errors.push(errorMsg)

      // Update status to ERROR
      await this.updateSyncStatus(accountId, 'ERROR')

      return result
    }
  }

  /**
   * Performs incremental sync for an existing account
   * Fetches only emails newer than lastSyncAt timestamp
   * 
   * Requirements: 3.2, 3.4
   * 
   * @param accountId - Google account ID
   * @returns Sync result with count of new emails
   */
  async incrementalSync(accountId: string): Promise<SyncResult> {
    logger.info(`Starting incremental sync for account ${accountId}`)

    const result: SyncResult = {
      accountId,
      accountEmail: '',
      newEmails: 0,
      errors: [],
      success: false
    }

    try {
      // Get account details
      const account = await prisma.googleAccount.findUnique({
        where: { id: accountId }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      result.accountEmail = account.email

      // Update status to SYNCING
      await this.updateSyncStatus(accountId, 'SYNCING')

      // Build query to fetch only new emails
      let query: string | undefined
      if (account.lastSyncAt) {
        // Convert lastSyncAt to Unix timestamp for Gmail API
        const timestamp = Math.floor(account.lastSyncAt.getTime() / 1000)
        query = `after:${timestamp}`
        logger.debug(`Using query: ${query}`)
      }

      // Fetch messages from Gmail
      const { messages } = await gmailApiService.listMessages(accountId, {
        maxResults: 100,
        query
      })

      logger.info(`Found ${messages.length} new messages for account ${accountId}`)

      // Fetch and store messages in parallel batches of 10
      const BATCH_SIZE = 10
      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE)
        
        await Promise.allSettled(
          batch.map(async (message) => {
            try {
              await this.fetchAndStoreMessage(accountId, account.email, message.id)
              result.newEmails++
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error'
              logger.error(`Failed to fetch message ${message.id}:`, error)
              result.errors.push(`Message ${message.id}: ${errorMsg}`)
            }
          })
        )
        
        logger.debug(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(messages.length / BATCH_SIZE)} for account ${accountId}`)
      }

      // Update lastSyncAt and status to IDLE
      await prisma.googleAccount.update({
        where: { id: accountId },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'IDLE'
        }
      })

      result.success = true
      logger.info(`Incremental sync completed for account ${accountId}: ${result.newEmails} new emails`)

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Incremental sync failed for account ${accountId}:`, error)
      result.errors.push(errorMsg)

      // Update status to ERROR
      await this.updateSyncStatus(accountId, 'ERROR')

      return result
    }
  }

  /**
   * Syncs a single account (initial or incremental based on lastSyncAt)
   * Updates sync status: IDLE → SYNCING → IDLE/ERROR
   * 
   * Requirements: 3.3, 3.4, 3.5
   * 
   * @param accountId - Google account ID
   * @returns Sync result
   */
  async syncAccount(accountId: string): Promise<SyncResult> {
    try {
      // Get account to check if it needs initial or incremental sync
      const account = await prisma.googleAccount.findUnique({
        where: { id: accountId }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      // Determine sync type based on lastSyncAt
      if (!account.lastSyncAt) {
        return await this.initialSync(accountId)
      } else {
        return await this.incrementalSync(accountId)
      }
    } catch (error) {
      logger.error(`Failed to sync account ${accountId}:`, error)
      
      // Schedule retry after 1 minute
      setTimeout(() => {
        logger.info(`Retrying sync for account ${accountId} after error`)
        this.syncAccount(accountId).catch(err => {
          logger.error(`Retry failed for account ${accountId}:`, err)
        })
      }, this.RETRY_DELAY_MS)

      throw error
    }
  }

  /**
   * Syncs all connected accounts sequentially
   * Processes accounts one at a time to avoid rate limits
   * 
   * Requirements: 3.2, 3.6
   * 
   * @returns Array of sync results for all accounts
   */
  async syncAllAccounts(): Promise<SyncResult[]> {
    logger.info('Starting sync for all accounts')

    try {
      // Get all accounts that are not currently syncing
      const accounts = await prisma.googleAccount.findMany({
        where: {
          syncStatus: {
            not: 'SYNCING'
          }
        },
        orderBy: {
          lastSyncAt: 'asc' // Sync oldest first
        }
      })

      logger.info(`Found ${accounts.length} accounts to sync`)

      const results: SyncResult[] = []

      // Process accounts sequentially
      for (const account of accounts) {
        try {
          const result = await this.syncAccount(account.id)
          results.push(result)
        } catch (error) {
          logger.error(`Failed to sync account ${account.id}:`, error)
          
          // Add error result
          results.push({
            accountId: account.id,
            accountEmail: account.email,
            newEmails: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            success: false
          })
        }
      }

      logger.info(`Completed sync for all accounts: ${results.length} accounts processed`)

      return results
    } catch (error) {
      logger.error('Failed to sync all accounts:', error)
      throw error
    }
  }

  /**
   * Starts the background sync scheduler
   * Runs syncAllAccounts() every 5 minutes
   * 
   * Requirements: 3.2, 3.6
   */
  startScheduler(): void {
    if (this.schedulerInterval) {
      logger.warn('Sync scheduler is already running')
      return
    }

    logger.info(`Starting sync scheduler (interval: ${this.SYNC_INTERVAL_MS}ms)`)

    // Run initial sync immediately
    this.syncAllAccounts().catch(error => {
      logger.error('Initial sync failed:', error)
    })

    // Schedule periodic syncs
    this.schedulerInterval = setInterval(() => {
      logger.info('Running scheduled sync')
      this.syncAllAccounts().catch(error => {
        logger.error('Scheduled sync failed:', error)
      })
    }, this.SYNC_INTERVAL_MS)
  }

  /**
   * Stops the background sync scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
      this.schedulerInterval = null
      logger.info('Sync scheduler stopped')
    }
  }

  /**
   * Updates sync status for an account
   * 
   * Requirements: 3.3
   * 
   * @param accountId - Google account ID
   * @param status - New sync status
   */
  private async updateSyncStatus(
    accountId: string,
    status: 'IDLE' | 'SYNCING' | 'ERROR'
  ): Promise<void> {
    await prisma.googleAccount.update({
      where: { id: accountId },
      data: { syncStatus: status }
    })
    logger.debug(`Updated sync status for account ${accountId}: ${status}`)
  }

  /**
   * Fetches a single message from Gmail and stores it in the database
   * Handles deduplication by checking gmailId
   * 
   * Requirements: 3.4, 4.3
   * 
   * @param accountId - Google account ID
   * @param accountEmail - Account email address
   * @param messageId - Gmail message ID
   */
  private async fetchAndStoreMessage(
    accountId: string,
    accountEmail: string,
    messageId: string
  ): Promise<void> {
    // Fetch message metadata from Gmail
    const message = await gmailApiService.getMessage(accountId, messageId)

    // Parse timestamp
    const timestamp = message.internalDate
      ? new Date(parseInt(message.internalDate))
      : new Date()

    // Determine if message is read (no UNREAD label)
    const isRead = !message.labelIds.includes('UNREAD')

    // Store in database (with deduplication)
    await emailRepository.createEmail({
      accountId,
      gmailId: message.id,
      threadId: message.threadId,
      subject: message.headers.subject || '(No Subject)',
      sender: message.headers.from || 'Unknown',
      recipient: accountEmail,
      preview: message.snippet,
      timestamp,
      isRead
    })

    logger.debug(`Stored message ${messageId} for account ${accountId}`)
  }
}

// Export singleton instance
export const syncService = new SyncService()
