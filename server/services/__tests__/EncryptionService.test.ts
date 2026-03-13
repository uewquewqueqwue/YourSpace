import { describe, it, expect, beforeAll } from 'vitest'
import { EncryptionService } from '../EncryptionService'

describe('EncryptionService', () => {
  let encryptionService: EncryptionService

  beforeAll(() => {
    // Set a test encryption key (32 bytes = 64 hex characters)
    process.env.OAUTH_ENCRYPTION_KEY = 'a'.repeat(64)
    encryptionService = new EncryptionService()
  })

  describe('constructor', () => {
    it('should throw error if OAUTH_ENCRYPTION_KEY is not set', () => {
      const originalKey = process.env.OAUTH_ENCRYPTION_KEY
      delete process.env.OAUTH_ENCRYPTION_KEY

      expect(() => new EncryptionService()).toThrow(
        'OAUTH_ENCRYPTION_KEY environment variable is not set'
      )

      process.env.OAUTH_ENCRYPTION_KEY = originalKey
    })

    it('should throw error if encryption key has invalid length', () => {
      const originalKey = process.env.OAUTH_ENCRYPTION_KEY
      process.env.OAUTH_ENCRYPTION_KEY = 'tooshort'

      expect(() => new EncryptionService()).toThrow(/must be 32 bytes/)

      process.env.OAUTH_ENCRYPTION_KEY = originalKey
    })

    it('should initialize successfully with valid key', () => {
      expect(() => new EncryptionService()).not.toThrow()
    })
  })

  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plaintext = 'my-secret-token'
      const encrypted = encryptionService.encrypt(plaintext)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(plaintext)
    })

    it('should return encrypted data in correct format (iv:encryptedData:authTag)', () => {
      const plaintext = 'test-data'
      const encrypted = encryptionService.encrypt(plaintext)

      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)
      
      // IV should be 32 hex characters (16 bytes)
      expect(parts[0]).toMatch(/^[a-f0-9]{32}$/)
      
      // Encrypted data should be hex
      expect(parts[1]).toMatch(/^[a-f0-9]+$/)
      
      // Auth tag should be 32 hex characters (16 bytes)
      expect(parts[2]).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should produce different encrypted output for same input (due to random IV)', () => {
      const plaintext = 'same-input'
      const encrypted1 = encryptionService.encrypt(plaintext)
      const encrypted2 = encryptionService.encrypt(plaintext)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should encrypt empty string', () => {
      const encrypted = encryptionService.encrypt('')
      expect(encrypted).toBeDefined()
      expect(encrypted.split(':')).toHaveLength(3)
    })

    it('should encrypt long strings', () => {
      const plaintext = 'a'.repeat(1000)
      const encrypted = encryptionService.encrypt(plaintext)
      
      expect(encrypted).toBeDefined()
      expect(encrypted.split(':')).toHaveLength(3)
    })

    it('should encrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const encrypted = encryptionService.encrypt(plaintext)
      
      expect(encrypted).toBeDefined()
      expect(encrypted.split(':')).toHaveLength(3)
    })

    it('should encrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا'
      const encrypted = encryptionService.encrypt(plaintext)
      
      expect(encrypted).toBeDefined()
      expect(encrypted.split(':')).toHaveLength(3)
    })
  })

  describe('decrypt', () => {
    it('should decrypt encrypted data back to original', () => {
      const plaintext = 'my-secret-token'
      const encrypted = encryptionService.encrypt(plaintext)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt empty string', () => {
      const plaintext = ''
      const encrypted = encryptionService.encrypt(plaintext)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt long strings', () => {
      const plaintext = 'a'.repeat(1000)
      const encrypted = encryptionService.encrypt(plaintext)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const encrypted = encryptionService.encrypt(plaintext)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا'
      const encrypted = encryptionService.encrypt(plaintext)
      const decrypted = encryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it('should throw error for invalid format', () => {
      expect(() => encryptionService.decrypt('invalid-format')).toThrow(
        'Failed to decrypt data'
      )
    })

    it('should throw error for malformed encrypted data', () => {
      expect(() => encryptionService.decrypt('aaa:bbb:ccc')).toThrow(
        'Failed to decrypt data'
      )
    })

    it('should throw error if auth tag is tampered', () => {
      const plaintext = 'test-data'
      const encrypted = encryptionService.encrypt(plaintext)
      
      // Tamper with auth tag
      const parts = encrypted.split(':')
      parts[2] = 'f'.repeat(32) // Replace auth tag with invalid one
      const tampered = parts.join(':')

      expect(() => encryptionService.decrypt(tampered)).toThrow(
        'Failed to decrypt data'
      )
    })

    it('should throw error if encrypted data is tampered', () => {
      const plaintext = 'test-data'
      const encrypted = encryptionService.encrypt(plaintext)
      
      // Tamper with encrypted data
      const parts = encrypted.split(':')
      parts[1] = 'f'.repeat(parts[1].length)
      const tampered = parts.join(':')

      expect(() => encryptionService.decrypt(tampered)).toThrow(
        'Failed to decrypt data'
      )
    })
  })

  describe('encrypt/decrypt round-trip', () => {
    it('should handle multiple encrypt/decrypt cycles', () => {
      const plaintext = 'test-token-123'
      
      const encrypted1 = encryptionService.encrypt(plaintext)
      const decrypted1 = encryptionService.decrypt(encrypted1)
      expect(decrypted1).toBe(plaintext)
      
      const encrypted2 = encryptionService.encrypt(decrypted1)
      const decrypted2 = encryptionService.decrypt(encrypted2)
      expect(decrypted2).toBe(plaintext)
    })

    it('should handle OAuth token-like strings', () => {
      const accessToken = 'ya29.a0AfH6SMBx...' // Typical Google OAuth token format
      const refreshToken = '1//0gHdP9K3...'
      
      const encryptedAccess = encryptionService.encrypt(accessToken)
      const encryptedRefresh = encryptionService.encrypt(refreshToken)
      
      expect(encryptionService.decrypt(encryptedAccess)).toBe(accessToken)
      expect(encryptionService.decrypt(encryptedRefresh)).toBe(refreshToken)
    })
  })
})
