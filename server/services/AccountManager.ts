import { prisma } from '../prisma'
import { oauthService } from './OAuthService'
import { emailRepository } from '../repositories/EmailRepository'
import logger from '../utils/logger'
import type { GoogleAccount } from '@prisma/client'

/**
 * AccountManager handles Google account connections and management
 * 
 * Features:
 * - Enforces 10 account limit per user
 * - Manages account connections via OAuth
 * - Handles account disconnection with cascade email deletion
 * - Provides account listing with email counts
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * 
 * @example
 * ```typescript
 * // Connect a new account
 * const { authUrl, state } = await accountManager.connectAccount('user123')
 * 
 * // List all accounts with email counts
 * const accounts = await accountManager.listAccounts('user123')
 * 
 * // Disconnect an account
 * await accountManager.disconnectAccount('account123')
 * ```
 */

interface AccountWithEmailCount {
  id: string
  email: string
  lastSyncAt: Date | null
  syncStatus: 'IDLE' | 'SYNCING' | 'ERROR'
  emailCount: number
}

export class AccountManager {
  /**
   * Initiates OAuth flow to connect a new Google account
   * Enforces 10 account limit per user
   * 
   * Requirements: 2.1, 2.3
   * 
   * @param userId - User ID to connect account for
   * @returns OAuth authorization URL and state token
   * @throws Error if user has reached 10 account limit
   */
  async connectAccount(userId: string): Promise<{
    authUrl: string
    state: string
  }> {
    try {
      // Check current account count
      const accountCount = await prisma.googleAccount.count({
        where: { userId }
      })

      // Enforce 10 account limit
      if (accountCount >= 10) {
        logger.warn(`User ${userId} attempted to connect account but has reached limit of 10`)
        throw new Error('You have reached the maximum of 10 connected accounts')
      }

      // Generate OAuth authorization URL
      const { url, state } = await oauthService.generateAuthUrl(userId)

      logger.info(`Generated OAuth URL for user ${userId} (${accountCount + 1}/10 accounts)`)

      return { authUrl: url, state }
    } catch (error) {
      logger.error(`Failed to initiate account connection for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Disconnects a Google account and deletes all associated emails
   * 
   * Requirements: 2.5, 4.5
   * 
   * @param accountId - Google account ID to disconnect
   * @returns Number of emails deleted
   * @throws Error if account not found
   */
  async disconnectAccount(accountId: string): Promise<{ emailsDeleted: number }> {
    try {
      // Verify account exists
      const account = await prisma.googleAccount.findUnique({
        where: { id: accountId }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      // Delete all emails for this account first (explicit cascade)
      const emailsDeleted = await emailRepository.deleteByAccount(accountId)

      // Delete the account (will cascade delete emails via Prisma schema)
      await prisma.googleAccount.delete({
        where: { id: accountId }
      })

      logger.info(`Disconnected account ${accountId}, deleted ${emailsDeleted} emails`)

      return { emailsDeleted }
    } catch (error) {
      logger.error(`Failed to disconnect account ${accountId}:`, error)
      throw error
    }
  }

  /**
   * Lists all connected Google accounts for a user with email counts
   * 
   * Requirements: 2.4, 6.4
   * 
   * @param userId - User ID to list accounts for
   * @returns Array of accounts with email counts
   */
  async listAccounts(userId: string): Promise<AccountWithEmailCount[]> {
    try {
      // Get all accounts for user
      const accounts = await prisma.googleAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      })

      // Get email counts for each account
      const accountsWithCounts = await Promise.all(
        accounts.map(async (account) => {
          const emailCount = await prisma.email.count({
            where: { accountId: account.id }
          })

          return {
            id: account.id,
            email: account.email,
            lastSyncAt: account.lastSyncAt,
            syncStatus: account.syncStatus,
            emailCount
          }
        })
      )

      logger.debug(`Listed ${accountsWithCounts.length} accounts for user ${userId}`)

      return accountsWithCounts
    } catch (error) {
      logger.error(`Failed to list accounts for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Gets a single account by ID
   * 
   * @param accountId - Google account ID
   * @returns Account or null if not found
   */
  async getAccount(accountId: string): Promise<GoogleAccount | null> {
    try {
      return await prisma.googleAccount.findUnique({
        where: { id: accountId }
      })
    } catch (error) {
      logger.error(`Failed to get account ${accountId}:`, error)
      throw error
    }
  }

  /**
   * Gets account count for a user
   * 
   * @param userId - User ID
   * @returns Number of connected accounts
   */
  async getAccountCount(userId: string): Promise<number> {
    try {
      return await prisma.googleAccount.count({
        where: { userId }
      })
    } catch (error) {
      logger.error(`Failed to get account count for user ${userId}:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const accountManager = new AccountManager()
