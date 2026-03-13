import { google } from 'googleapis'
import { oauthService } from './OAuthService'
import logger from '../utils/logger'

/**
 * GmailApiService wraps the Google Gmail API
 * 
 * Features:
 * - List messages with pagination
 * - Get message metadata
 * - Modify message read status
 * - Rate limit handling with exponential backoff
 * - Automatic token refresh on 401 errors
 * 
 * Requirements: 3.5, 7.4, 7.5, 10.3
 * 
 * @example
 * ```typescript
 * const service = new GmailApiService()
 * 
 * // List messages with pagination
 * const { messages, nextPageToken } = await service.listMessages('account123', { maxResults: 100 })
 * 
 * // Get message metadata
 * const message = await service.getMessage('account123', 'messageId')
 * 
 * // Mark message as read
 * await service.modifyMessage('account123', 'messageId', { markAsRead: true })
 * ```
 */

export interface ListMessagesOptions {
  maxResults?: number
  pageToken?: string
  query?: string
}

export interface ListMessagesResult {
  messages: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate: number
}

export interface MessageMetadata {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: string
  headers: {
    subject?: string
    from?: string
    to?: string
    date?: string
  }
}

export interface ModifyMessageOptions {
  markAsRead?: boolean
}

export class GmailApiService {
  private readonly MAX_RETRIES = 3
  private readonly INITIAL_BACKOFF_MS = 1000

  /**
   * Lists messages from a Gmail account with pagination
   * 
   * Requirements: 3.5, 7.5
   * 
   * @param accountId - Google account ID
   * @param options - List options (maxResults, pageToken, query)
   * @returns List of message IDs and pagination token
   * @throws Error if API call fails after retries
   */
  async listMessages(
    accountId: string,
    options: ListMessagesOptions = {}
  ): Promise<ListMessagesResult> {
    const { maxResults = 100, pageToken, query } = options

    return this.executeWithRetry(accountId, async (oauth2Client) => {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken,
        q: query
      })

      logger.debug(`Listed ${response.data.messages?.length || 0} messages for account ${accountId}`)

      return {
        messages: (response.data.messages || []).map(m => ({
          id: m.id!,
          threadId: m.threadId!
        })),
        nextPageToken: response.data.nextPageToken || undefined,
        resultSizeEstimate: response.data.resultSizeEstimate || 0
      }
    })
  }

  /**
   * Gets message metadata (headers only, not full body)
   * 
   * Requirements: 3.5, 7.5
   * 
   * @param accountId - Google account ID
   * @param messageId - Gmail message ID
   * @returns Message metadata with headers
   * @throws Error if API call fails after retries
   */
  async getMessage(accountId: string, messageId: string): Promise<MessageMetadata> {
    return this.executeWithRetry(accountId, async (oauth2Client) => {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Date']
      })

      const message = response.data

      // Extract headers
      const headers: MessageMetadata['headers'] = {}
      if (message.payload?.headers) {
        for (const header of message.payload.headers) {
          const name = header.name?.toLowerCase()
          if (name === 'subject') headers.subject = header.value || undefined
          if (name === 'from') headers.from = header.value || undefined
          if (name === 'to') headers.to = header.value || undefined
          if (name === 'date') headers.date = header.value || undefined
        }
      }

      logger.debug(`Retrieved message ${messageId} for account ${accountId}`)

      return {
        id: message.id!,
        threadId: message.threadId!,
        labelIds: message.labelIds || [],
        snippet: message.snippet || '',
        internalDate: message.internalDate || '',
        headers
      }
    })
  }

  /**
   * Modifies message labels (mark as read/unread)
   * 
   * Requirements: 7.4, 7.5
   * 
   * @param accountId - Google account ID
   * @param messageId - Gmail message ID
   * @param options - Modification options (markAsRead)
   * @throws Error if API call fails after retries
   */
  async modifyMessage(
    accountId: string,
    messageId: string,
    options: ModifyMessageOptions
  ): Promise<void> {
    return this.executeWithRetry(accountId, async (oauth2Client) => {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      const addLabelIds: string[] = []
      const removeLabelIds: string[] = []

      if (options.markAsRead === true) {
        removeLabelIds.push('UNREAD')
      } else if (options.markAsRead === false) {
        addLabelIds.push('UNREAD')
      }

      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds
        }
      })

      logger.debug(`Modified message ${messageId} for account ${accountId}`)
    })
  }

  /**
   * Executes a Gmail API operation with automatic token refresh and retry logic
   * 
   * Handles:
   * - 401 errors: Refreshes access token and retries
   * - 429 errors: Rate limit with exponential backoff
   * - Network errors: Exponential backoff retry
   * 
   * Requirements: 3.5, 7.5, 10.3
   * 
   * @param accountId - Google account ID
   * @param operation - Async operation to execute with OAuth2 client
   * @returns Result of the operation
   * @throws Error if all retries fail
   */
  private async executeWithRetry<T>(
    accountId: string,
    operation: (oauth2Client: any) => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Ensure we have a valid access token (auto-refreshes if expired)
        const accessToken = await oauthService.ensureValidToken(accountId)

        // Create OAuth2 client with the access token
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken })

        // Execute the operation with OAuth2 client
        return await operation(oauth2Client)
      } catch (error: any) {
        lastError = error

        // Handle 401 Unauthorized - token expired or invalid
        if (error.code === 401 || error.response?.status === 401) {
          logger.warn(`Token expired for account ${accountId}, refreshing...`)
          
          try {
            await oauthService.refreshAccessToken(accountId)
            // Retry immediately after refresh
            continue
          } catch (refreshError) {
            logger.error(`Failed to refresh token for account ${accountId}:`, refreshError)
            throw new Error('Your Gmail authorization has expired. Please reconnect your account.')
          }
        }

        // Handle 429 Rate Limit - wait longer
        if (error.code === 429 || error.response?.status === 429) {
          const backoffMs = 60000 // Wait 1 minute for rate limits
          logger.warn(`Rate limit hit for account ${accountId}, waiting ${backoffMs}ms`)
          
          if (attempt < this.MAX_RETRIES) {
            await this.sleep(backoffMs)
            continue
          }
          
          throw new Error('Gmail API rate limit exceeded. Please try again later.')
        }

        // Handle other errors with exponential backoff
        if (attempt < this.MAX_RETRIES) {
          const backoffMs = this.INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1)
          logger.warn(`Gmail API error for account ${accountId}, retry ${attempt}/${this.MAX_RETRIES} after ${backoffMs}ms:`, error.message)
          await this.sleep(backoffMs)
          continue
        }

        // All retries exhausted
        logger.error(`Gmail API operation failed after ${this.MAX_RETRIES} attempts for account ${accountId}:`, error)
        throw new Error(`Gmail API error: ${error.message || 'Unknown error'}`)
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Gmail API operation failed')
  }

  /**
   * Sleep utility for backoff delays
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const gmailApiService = new GmailApiService()
