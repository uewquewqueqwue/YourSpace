import { google } from 'googleapis'
import crypto from 'crypto'
import http from 'http'
import { encryptionService } from './EncryptionService'
import { prisma } from '../prisma'
import logger from '../utils/logger'
import type { GoogleAccount } from '@prisma/client'

/**
 * OAuthService handles Google OAuth 2.0 authentication for Desktop apps
 * 
 * Features:
 * - Desktop App OAuth flow with loopback redirect (http://127.0.0.1)
 * - Dynamic port allocation to avoid conflicts
 * - Works for ANY user without Google verification
 * - Opens system browser for authorization
 * - Automatic token refresh when expired
 * - Token encryption at rest using AES-256
 * - Gmail API scopes: gmail.readonly and gmail.modify
 * 
 * Why Desktop App flow?
 * - No need for Google verification process
 * - Works in production without test user limitations
 * - Official Google recommendation for native apps
 * - More secure than Web Application flow for desktop apps
 * 
 * @example
 * ```typescript
 * // Generate authorization URL and start callback server
 * const { url, state } = await oauthService.generateAuthUrl('user123')
 * // Browser opens, user authorizes, callback is handled automatically
 * 
 * // Refresh expired token
 * await oauthService.refreshAccessToken('account123')
 * ```
 */

// OAuth state storage
interface OAuthState {
  userId: string
  createdAt: number
  resolve?: (code: string) => void
  reject?: (error: Error) => void
  server?: http.Server
}

const oauthStates = new Map<string, OAuthState>()

// Clean up expired states (older than 10 minutes)
setInterval(() => {
  const now = Date.now()
  const tenMinutes = 10 * 60 * 1000
  
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.createdAt > tenMinutes) {
      oauthStates.delete(state)
    }
  }
}, 60 * 1000) // Run every minute

export class OAuthService {
  private clientId: string
  private clientSecret: string
  private redirectPort: number | null = null

  constructor() {
    // Get OAuth credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables')
    }

    this.clientId = clientId
    this.clientSecret = clientSecret

    logger.info('OAuthService initialized successfully')
  }

  /**
   * Creates OAuth2Client with specific redirect URI
   * @param redirectUri - Full redirect URI including port
   * @returns Configured OAuth2Client
   */
  private createOAuth2Client(redirectUri: string) {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      redirectUri
    )
  }

  /**
   * Finds an available port for the OAuth callback server
   * @returns Available port number
   */
  private async findAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = http.createServer()
      
      // Let the OS assign a random available port
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (address && typeof address === 'object') {
          const port = address.port
          server.close(() => resolve(port))
        } else {
          server.close(() => reject(new Error('Failed to get server address')))
        }
      })

      server.on('error', (err) => {
        reject(err)
      })
    })
  }

  /**
   * Starts local HTTP server to receive OAuth callback on dynamic port
   * @param state - State token for this OAuth flow
   * @returns Promise that resolves with authorization code and port
   */
  private startCallbackServer(state: string): Promise<{ code: string; port: number }> {
    return new Promise(async (resolve, reject) => {
      try {
        // Find available port
        const port = await this.findAvailablePort()
        this.redirectPort = port

        const server = http.createServer((req, res) => {
          const url = new URL(req.url || '', `http://127.0.0.1:${port}`)
          
          // Check if this is the OAuth callback
          if (url.pathname === '/') {
            const code = url.searchParams.get('code')
            const returnedState = url.searchParams.get('state')
            const error = url.searchParams.get('error')

            // Send response to browser
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
            
            if (error) {
              res.end(`
                <html>
                  <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>❌ Authorization Failed</h1>
                    <p>Error: ${error}</p>
                    <p>You can close this window.</p>
                    <script>setTimeout(() => window.close(), 3000)</script>
                  </body>
                </html>
              `)
              reject(new Error(`OAuth error: ${error}`))
              server.close()
              return
            }

            if (!code || returnedState !== state) {
              res.end(`
                <html>
                  <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>❌ Invalid Request</h1>
                    <p>Missing or invalid authorization code.</p>
                    <p>You can close this window.</p>
                    <script>setTimeout(() => window.close(), 3000)</script>
                  </body>
                </html>
              `)
              reject(new Error('Invalid authorization code or state'))
              server.close()
              return
            }

            // Success!
            res.end(`
              <html>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                  <h1>✅ Authorization Successful!</h1>
                  <p>Your Gmail account has been connected.</p>
                  <p>You can close this window and return to the app.</p>
                  <script>setTimeout(() => window.close(), 2000)</script>
                </body>
              </html>
            `)
            
            resolve({ code, port })
            server.close()
          }
        })

        server.on('error', (err) => {
          logger.error('OAuth callback server error:', err)
          reject(new Error('Failed to start OAuth callback server'))
        })

        server.listen(port, '127.0.0.1', () => {
          logger.info(`OAuth callback server listening on 127.0.0.1:${port}`)
        })

        // Store server reference for cleanup
        const stateData = oauthStates.get(state)
        if (stateData) {
          stateData.server = server
        }

        // Timeout after 5 minutes
        setTimeout(() => {
          if (server.listening) {
            server.close()
            reject(new Error('OAuth timeout - no response received'))
          }
        }, 5 * 60 * 1000)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Generates authorization URL and starts callback server with dynamic port
   * @param userId - User ID to associate with this OAuth flow
   * @returns Authorization URL and state token
   */
  async generateAuthUrl(userId: string): Promise<{
    url: string
    state: string
    codeVerifier: string
  }> {
    try {
      // Generate random state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex')

      // Store state with user ID
      oauthStates.set(state, {
        userId,
        createdAt: Date.now()
      })

      // Start local callback server and get the dynamic port
      this.startCallbackServer(state).then(async ({ code, port }) => {
        try {
          // Automatically handle callback when code is received
          const account = await this.handleCallback(code, state, port)
          logger.info(`OAuth flow completed automatically for user ${userId}`)
          
          // Trigger initial sync in background
          // Import syncService dynamically to avoid circular dependency
          const { syncService } = await import('./SyncService')
          syncService.syncAccount(account.id).catch(error => {
            logger.error(`Initial sync failed for account ${account.id}:`, error)
          })
        } catch (error) {
          logger.error('Auto-callback handling failed:', error)
        }
      }).catch((error) => {
        logger.error('Callback server failed:', error)
        oauthStates.delete(state)
      })

      // Wait a bit for server to start and get port
      await new Promise(resolve => setTimeout(resolve, 100))

      if (!this.redirectPort) {
        throw new Error('Failed to start callback server')
      }

      // Create OAuth2Client with the dynamic redirect URI
      const redirectUri = `http://127.0.0.1:${this.redirectPort}`
      const oauth2Client = this.createOAuth2Client(redirectUri)

      // Generate authorization URL
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Request refresh token
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        state,
        prompt: 'consent' // Force consent screen to get refresh token
      })

      logger.info(`Generated OAuth URL for user ${userId} with redirect port ${this.redirectPort}`)

      return { url, state, codeVerifier: '' }
    } catch (error) {
      logger.error('Failed to generate auth URL:', error)
      throw new Error('Failed to generate authorization URL')
    }
  }

  /**
   * Handles OAuth callback and exchanges authorization code for tokens
   * @param code - Authorization code from Google
   * @param state - State token for CSRF validation
   * @param port - Port used for redirect URI
   * @returns Created GoogleAccount with encrypted tokens
   */
  async handleCallback(code: string, state: string, port?: number): Promise<GoogleAccount> {
    try {
      // Validate state and retrieve stored data
      const stateData = oauthStates.get(state)
      
      if (!stateData) {
        throw new Error('Invalid or expired state token')
      }

      const { userId, server } = stateData

      // Clean up callback server if still running
      if (server && server.listening) {
        server.close()
      }

      // Clean up used state
      oauthStates.delete(state)

      // Create OAuth2Client with the redirect URI used in auth URL
      const redirectUri = port ? `http://127.0.0.1:${port}` : 'http://127.0.0.1'
      const oauth2Client = this.createOAuth2Client(redirectUri)

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code)

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('Failed to obtain access or refresh token')
      }

      // Set credentials to get user info
      oauth2Client.setCredentials(tokens)

      // Get user's email address
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const { data: userInfo } = await oauth2.userinfo.get()

      if (!userInfo.email) {
        throw new Error('Failed to retrieve user email')
      }

      // Calculate token expiry
      const expiresIn = tokens.expiry_date 
        ? new Date(tokens.expiry_date)
        : new Date(Date.now() + 3600 * 1000) // Default to 1 hour

      // Encrypt tokens before storage
      const encryptedAccessToken = encryptionService.encrypt(tokens.access_token)
      const encryptedRefreshToken = encryptionService.encrypt(tokens.refresh_token)

      // Check if account already exists
      const existingAccount = await prisma.googleAccount.findUnique({
        where: {
          userId_email: {
            userId,
            email: userInfo.email
          }
        }
      })

      if (existingAccount) {
        // Update existing account with new tokens
        const updatedAccount = await prisma.googleAccount.update({
          where: { id: existingAccount.id },
          data: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiry: expiresIn,
            syncStatus: 'IDLE'
          }
        })

        logger.info(`Updated OAuth tokens for account ${updatedAccount.id}`)
        return updatedAccount
      }

      // Create new account
      const account = await prisma.googleAccount.create({
        data: {
          userId,
          email: userInfo.email,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiry: expiresIn,
          syncStatus: 'IDLE'
        }
      })

      logger.info(`Created new Google account ${account.id} for user ${userId}`)

      return account
    } catch (error) {
      logger.error('OAuth callback failed:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant')) {
          throw new Error('Authorization failed. The code may have expired or been used already.')
        }
        if (error.message.includes('access_denied')) {
          throw new Error('You denied access to your Gmail account.')
        }
      }
      
      throw new Error('Authentication error. Please try again.')
    }
  }

  /**
   * Refreshes an expired access token using the refresh token
   * @param accountId - Google account ID
   * @returns Updated GoogleAccount with new access token
   */
  async refreshAccessToken(accountId: string): Promise<GoogleAccount> {
    try {
      // Get account with encrypted tokens
      const account = await prisma.googleAccount.findUnique({
        where: { id: accountId }
      })

      if (!account) {
        throw new Error('Account not found')
      }

      // Decrypt refresh token
      const refreshToken = encryptionService.decrypt(account.refreshToken)

      // Create OAuth2Client for token refresh (redirect URI doesn't matter here)
      const oauth2Client = this.createOAuth2Client('http://127.0.0.1')

      // Set refresh token and request new access token
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      const { credentials } = await oauth2Client.refreshAccessToken()

      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token')
      }

      // Calculate new expiry
      const expiresIn = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000) // Default to 1 hour

      // Encrypt new access token
      const encryptedAccessToken = encryptionService.encrypt(credentials.access_token)

      // Update account with new token
      const updatedAccount = await prisma.googleAccount.update({
        where: { id: accountId },
        data: {
          accessToken: encryptedAccessToken,
          tokenExpiry: expiresIn
        }
      })

      logger.info(`Refreshed access token for account ${accountId}`)

      return updatedAccount
    } catch (error) {
      logger.error(`Failed to refresh token for account ${accountId}:`, error)
      
      if (error instanceof Error && error.message.includes('invalid_grant')) {
        // Refresh token is invalid - mark account as requiring re-authentication
        await prisma.googleAccount.update({
          where: { id: accountId },
          data: { syncStatus: 'ERROR' }
        })
        
        throw new Error('Your Gmail authorization has expired. Please reconnect your account.')
      }
      
      throw new Error('Failed to refresh access token')
    }
  }

  /**
   * Gets decrypted tokens for an account
   * @param accountId - Google account ID
   * @returns Decrypted access and refresh tokens
   */
  async getDecryptedTokens(accountId: string): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    const account = await prisma.googleAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    return {
      accessToken: encryptionService.decrypt(account.accessToken),
      refreshToken: encryptionService.decrypt(account.refreshToken)
    }
  }

  /**
   * Checks if access token is expired and refreshes if needed
   * @param accountId - Google account ID
   * @returns Valid access token
   */
  async ensureValidToken(accountId: string): Promise<string> {
    const account = await prisma.googleAccount.findUnique({
      where: { id: accountId }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date()
    const expiryWithBuffer = new Date(account.tokenExpiry.getTime() - 5 * 60 * 1000)

    if (now >= expiryWithBuffer) {
      logger.info(`Token expired for account ${accountId}, refreshing...`)
      const updatedAccount = await this.refreshAccessToken(accountId)
      return encryptionService.decrypt(updatedAccount.accessToken)
    }

    return encryptionService.decrypt(account.accessToken)
  }
}

// Export singleton instance with lazy initialization
let _oauthService: OAuthService | null = null

export const oauthService = {
  get instance(): OAuthService {
    if (!_oauthService) {
      _oauthService = new OAuthService()
    }
    return _oauthService
  },

  generateAuthUrl(userId: string) {
    return this.instance.generateAuthUrl(userId)
  },

  handleCallback(code: string, state: string) {
    return this.instance.handleCallback(code, state)
  },

  refreshAccessToken(accountId: string) {
    return this.instance.refreshAccessToken(accountId)
  },

  getDecryptedTokens(accountId: string) {
    return this.instance.getDecryptedTokens(accountId)
  },

  ensureValidToken(accountId: string) {
    return this.instance.ensureValidToken(accountId)
  }
}
