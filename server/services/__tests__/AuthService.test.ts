import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// Mock environment and prisma BEFORE any imports
beforeAll(() => {
  process.env.DATABASE_URL = 'mock-database-url'
  process.env.JWT_SECRET = 'mock-jwt-secret'
})

vi.mock('../../prisma', () => ({
  prisma: {}
}))

import { AuthService } from '../AuthService'
import { userRepository } from '../../repositories/UserRepository'
import { AuthenticationError, ConflictError } from '../../utils/errors'
import bcrypt from 'bcrypt'

vi.mock('../../repositories/UserRepository')
vi.mock('bcrypt')
vi.mock('../../middleware/auth', () => ({
  createToken: vi.fn(() => 'mock-token')
}))
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService()
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123'
      })

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('token')
      expect(result.user).not.toHaveProperty('password')
      expect(result.token).toBe('mock-token')
    })

    it('should throw AuthenticationError if user not found', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null)

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(AuthenticationError)
    })

    it('should throw AuthenticationError if password is invalid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrong-password'
        })
      ).rejects.toThrow(AuthenticationError)
    })

    it('should throw validation error for invalid email', async () => {
      await expect(
        authService.login({
          email: 'invalid-email',
          password: 'password123'
        })
      ).rejects.toThrow()
    })

    it('should throw validation error for short password', async () => {
      await expect(
        authService.login({
          email: 'test@example.com',
          password: '123'
        })
      ).rejects.toThrow()
    })
  })

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        password: 'hashed-password',
        name: 'New User',
        avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=newuser@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(userRepository.exists).mockResolvedValue(false)
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never)
      vi.mocked(userRepository.create).mockResolvedValue(mockUser)

      const result = await authService.register({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123'
      })

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('token')
      expect(result.user).not.toHaveProperty('password')
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
    })

    it('should throw ConflictError if user already exists', async () => {
      vi.mocked(userRepository.exists).mockResolvedValue(true)

      await expect(
        authService.register({
          name: 'Test User',
          email: 'existing@example.com',
          password: 'password123'
        })
      ).rejects.toThrow(ConflictError)
    })

    it('should throw validation error for short name', async () => {
      await expect(
        authService.register({
          name: 'A',
          email: 'test@example.com',
          password: 'password123'
        })
      ).rejects.toThrow()
    })

    it('should throw validation error for invalid email', async () => {
      await expect(
        authService.register({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        })
      ).rejects.toThrow()
    })
  })

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Updated Name',
        avatar: 'https://example.com/avatar.png',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      vi.mocked(userRepository.update).mockResolvedValue(mockUser)

      const result = await authService.updateProfile('1', {
        name: 'Updated Name',
        avatar: 'https://example.com/avatar.png'
      })

      expect(result).not.toHaveProperty('password')
      expect(result.name).toBe('Updated Name')
      expect(result.avatar).toBe('https://example.com/avatar.png')
    })

    it('should throw validation error if no updates provided', async () => {
      await expect(
        authService.updateProfile('1', {})
      ).rejects.toThrow()
    })
  })
})
