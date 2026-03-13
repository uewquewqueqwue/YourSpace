import crypto from 'crypto'
import logger from '../utils/logger'

/**
 * EncryptionService provides AES-256-GCM encryption/decryption for OAuth tokens
 * 
 * @example
 * ```typescript
 * import { encryptionService } from './EncryptionService'
 * 
 * // Encrypt an OAuth token
 * const accessToken = 'ya29.a0AfH6SMBx...'
 * const encrypted = encryptionService.encrypt(accessToken)
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 * 
 * // Store encrypted token in database
 * await prisma.googleAccount.create({
 *   data: {
 *     accessToken: encrypted,
 *     // ... other fields
 *   }
 * })
 * 
 * // Decrypt when needed
 * const decrypted = encryptionService.decrypt(encrypted)
 * // Returns: "ya29.a0AfH6SMBx..."
 * ```
 * 
 * @remarks
 * - Requires OAUTH_ENCRYPTION_KEY environment variable (32 bytes hex)
 * - Generate key using: `openssl rand -hex 32`
 * - Encrypted format: "iv:encryptedData:authTag"
 * - Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits

export class EncryptionService {
  private encryptionKey: Buffer

  constructor() {
    const keyHex = process.env.OAUTH_ENCRYPTION_KEY
    
    if (!keyHex) {
      throw new Error('OAUTH_ENCRYPTION_KEY environment variable is not set')
    }

    // Convert hex string to buffer
    this.encryptionKey = Buffer.from(keyHex, 'hex')

    if (this.encryptionKey.length !== KEY_LENGTH) {
      throw new Error(
        `OAUTH_ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters). ` +
        `Current length: ${this.encryptionKey.length} bytes. ` +
        `Generate a valid key using: openssl rand -hex 32`
      )
    }

    logger.info('EncryptionService initialized successfully')
  }

  /**
   * Encrypts data using AES-256-GCM
   * @param plaintext - The data to encrypt
   * @returns Encrypted data in format "iv:encryptedData:authTag"
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(IV_LENGTH)

      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex')
      encrypted += cipher.final('hex')

      // Get authentication tag
      const authTag = cipher.getAuthTag()

      // Return in format: iv:encryptedData:authTag
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`
    } catch (error) {
      logger.error('Encryption failed:', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypts data that was encrypted with encrypt()
   * @param encryptedData - Data in format "iv:encryptedData:authTag"
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string): string {
    try {
      // Parse the encrypted data format
      const parts = encryptedData.split(':')
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format. Expected format: iv:encryptedData:authTag')
      }

      const [ivHex, encrypted, authTagHex] = parts

      // Convert hex strings back to buffers
      const iv = Buffer.from(ivHex, 'hex')
      const authTag = Buffer.from(authTagHex, 'hex')

      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv)
      decipher.setAuthTag(authTag)

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      logger.error('Decryption failed:', error)
      throw new Error('Failed to decrypt data')
    }
  }
}

// Lazy initialization to avoid errors during testing
let _encryptionService: EncryptionService | null = null

export const encryptionService = {
  get instance(): EncryptionService {
    if (!_encryptionService) {
      _encryptionService = new EncryptionService()
    }
    return _encryptionService
  },
  
  encrypt(plaintext: string): string {
    return this.instance.encrypt(plaintext)
  },
  
  decrypt(encryptedData: string): string {
    return this.instance.decrypt(encryptedData)
  }
}
