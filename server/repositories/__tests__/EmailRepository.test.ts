import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'

// Mock environment BEFORE any imports
beforeAll(() => {
  process.env.DATABASE_URL = 'mock-database-url'
})

// Mock prisma client - use factory function to avoid hoisting issues
vi.mock('../../prisma', () => ({
  prisma: {
    email: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}))

import { EmailRepository } from '../EmailRepository'
import { prisma } from '../../prisma'

// Get reference to mocked prisma
const mockPrisma = prisma as any

describe('EmailRepository', () => {
  let repository: EmailRepository

  beforeEach(() => {
    repository = new EmailRepository()
    vi.clearAllMocks()
  })

  describe('createEmail', () => {
    it('should create a new email', async () => {
      const emailData = {
        accountId: 'account_123',
        gmailId: 'gmail_123',
        subject: 'Test Email',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'This is a test email preview',
        timestamp: new Date()
      }

      const mockEmail = {
        id: 'email_1',
        ...emailData,
        threadId: null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.email.findUnique.mockResolvedValue(null)
      mockPrisma.email.create.mockResolvedValue(mockEmail)

      const email = await repository.createEmail(emailData)

      expect(email).toBeDefined()
      expect(email.gmailId).toBe('gmail_123')
      expect(email.subject).toBe('Test Email')
      expect(email.isRead).toBe(false)
      expect(mockPrisma.email.create).toHaveBeenCalled()
    })

    it('should return existing email if gmailId already exists (deduplication)', async () => {
      const emailData = {
        accountId: 'account_123',
        gmailId: 'gmail_duplicate',
        subject: 'Original Email',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Original preview',
        timestamp: new Date()
      }

      const existingEmail = {
        id: 'email_existing',
        ...emailData,
        threadId: null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.email.findUnique.mockResolvedValue(existingEmail)

      const email = await repository.createEmail(emailData)

      // Should return existing email without creating new one
      expect(email.id).toBe('email_existing')
      expect(email.subject).toBe('Original Email')
      expect(mockPrisma.email.create).not.toHaveBeenCalled()
    })

    it('should set isRead to false by default', async () => {
      const emailData = {
        accountId: 'account_123',
        gmailId: 'gmail_unread',
        subject: 'Unread Email',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview text',
        timestamp: new Date()
      }

      const mockEmail = {
        id: 'email_2',
        ...emailData,
        threadId: null,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.email.findUnique.mockResolvedValue(null)
      mockPrisma.email.create.mockResolvedValue(mockEmail)

      const email = await repository.createEmail(emailData)
      expect(email.isRead).toBe(false)
    })

    it('should respect isRead value when provided', async () => {
      const emailData = {
        accountId: 'account_123',
        gmailId: 'gmail_read',
        subject: 'Read Email',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview text',
        timestamp: new Date(),
        isRead: true
      }

      const mockEmail = {
        id: 'email_3',
        ...emailData,
        threadId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.email.findUnique.mockResolvedValue(null)
      mockPrisma.email.create.mockResolvedValue(mockEmail)

      const email = await repository.createEmail(emailData)
      expect(email.isRead).toBe(true)
    })
  })

  describe('findByGmailId', () => {
    it('should find email by gmailId', async () => {
      const mockEmail = {
        id: 'email_1',
        accountId: 'account_123',
        gmailId: 'gmail_findme',
        threadId: null,
        subject: 'Find Me',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview',
        isRead: false,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.email.findUnique.mockResolvedValue(mockEmail)

      const found = await repository.findByGmailId('gmail_findme')

      expect(found).toBeDefined()
      expect(found?.subject).toBe('Find Me')
      expect(mockPrisma.email.findUnique).toHaveBeenCalledWith({
        where: { gmailId: 'gmail_findme' }
      })
    })

    it('should return null if gmailId not found', async () => {
      mockPrisma.email.findUnique.mockResolvedValue(null)

      const found = await repository.findByGmailId('nonexistent_gmail_id')
      expect(found).toBeNull()
    })
  })

  describe('listEmails', () => {
    const mockEmails = [
      {
        id: 'email_1',
        accountId: 'account_123',
        gmailId: 'gmail_1',
        threadId: null,
        subject: 'Email 1',
        sender: 'sender1@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview 1',
        timestamp: new Date('2024-01-01'),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email_2',
        accountId: 'account_123',
        gmailId: 'gmail_2',
        threadId: null,
        subject: 'Email 2',
        sender: 'sender2@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview 2',
        timestamp: new Date('2024-01-02'),
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email_3',
        accountId: 'account_123',
        gmailId: 'gmail_3',
        threadId: null,
        subject: 'Email 3',
        sender: 'sender3@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview 3',
        timestamp: new Date('2024-01-03'),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    it('should list all emails for an account', async () => {
      mockPrisma.email.findMany.mockResolvedValue(mockEmails)
      mockPrisma.email.count.mockResolvedValue(3)

      const result = await repository.listEmails({ accountId: 'account_123' })

      expect(result.emails).toHaveLength(3)
      expect(result.total).toBe(3)
    })

    it('should order emails by timestamp DESC (newest first)', async () => {
      const orderedEmails = [...mockEmails].reverse() // Newest first
      mockPrisma.email.findMany.mockResolvedValue(orderedEmails)
      mockPrisma.email.count.mockResolvedValue(3)

      const result = await repository.listEmails({ accountId: 'account_123' })

      expect(result.emails[0].subject).toBe('Email 3') // 2024-01-03
      expect(result.emails[1].subject).toBe('Email 2') // 2024-01-02
      expect(result.emails[2].subject).toBe('Email 1') // 2024-01-01
    })

    it('should filter by isRead status', async () => {
      const unreadEmails = mockEmails.filter(e => !e.isRead)
      mockPrisma.email.findMany.mockResolvedValue(unreadEmails)
      mockPrisma.email.count.mockResolvedValue(2)

      const result = await repository.listEmails({
        accountId: 'account_123',
        isRead: false
      })

      expect(result.emails).toHaveLength(2)
      expect(result.emails.every(e => !e.isRead)).toBe(true)
    })

    it('should support pagination with limit and offset', async () => {
      const page1 = mockEmails.slice(0, 2)
      mockPrisma.email.findMany.mockResolvedValue(page1)
      mockPrisma.email.count.mockResolvedValue(3)

      const result = await repository.listEmails({
        accountId: 'account_123',
        limit: 2,
        offset: 0
      })

      expect(result.emails).toHaveLength(2)
      expect(result.total).toBe(3)
      expect(mockPrisma.email.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 2,
          skip: 0
        })
      )
    })

    it('should filter by accountId', async () => {
      mockPrisma.email.findMany.mockResolvedValue(mockEmails)
      mockPrisma.email.count.mockResolvedValue(3)

      await repository.listEmails({ accountId: 'account_123' })

      expect(mockPrisma.email.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account_123'
          })
        })
      )
    })
  })

  describe('updateReadStatus', () => {
    it('should update email read status to true', async () => {
      const mockEmail = {
        id: 'email_1',
        accountId: 'account_123',
        gmailId: 'gmail_update',
        threadId: null,
        subject: 'Update Me',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview',
        timestamp: new Date(),
        isRead: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.email.update.mockResolvedValue(mockEmail)

      const updated = await repository.updateReadStatus('email_1', true)

      expect(updated.isRead).toBe(true)
      expect(mockPrisma.email.update).toHaveBeenCalledWith({
        where: { id: 'email_1' },
        data: { isRead: true }
      })
    })

    it('should update email read status to false', async () => {
      const mockEmail = {
        id: 'email_1',
        accountId: 'account_123',
        gmailId: 'gmail_update2',
        threadId: null,
        subject: 'Update Me',
        sender: 'sender@example.com',
        recipient: 'recipient@example.com',
        preview: 'Preview',
        timestamp: new Date(),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.email.update.mockResolvedValue(mockEmail)

      const updated = await repository.updateReadStatus('email_1', false)

      expect(updated.isRead).toBe(false)
    })
  })

  describe('deleteByAccount', () => {
    it('should delete all emails for an account', async () => {
      mockPrisma.email.deleteMany.mockResolvedValue({ count: 2 })

      const deletedCount = await repository.deleteByAccount('account_123')

      expect(deletedCount).toBe(2)
      expect(mockPrisma.email.deleteMany).toHaveBeenCalledWith({
        where: { accountId: 'account_123' }
      })
    })

    it('should return 0 if no emails to delete', async () => {
      mockPrisma.email.deleteMany.mockResolvedValue({ count: 0 })

      const deletedCount = await repository.deleteByAccount('account_123')
      expect(deletedCount).toBe(0)
    })
  })

  describe('searchEmails', () => {
    const mockSearchEmails = [
      {
        id: 'email_1',
        accountId: 'account_123',
        gmailId: 'gmail_search1',
        threadId: null,
        subject: 'Important Meeting Tomorrow',
        sender: 'boss@company.com',
        recipient: 'me@example.com',
        preview: 'Please prepare the quarterly report',
        timestamp: new Date('2024-01-01'),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email_2',
        accountId: 'account_123',
        gmailId: 'gmail_search2',
        threadId: null,
        subject: 'Lunch Plans',
        sender: 'friend@example.com',
        recipient: 'me@example.com',
        preview: 'Want to grab lunch tomorrow?',
        timestamp: new Date('2024-01-02'),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'email_3',
        accountId: 'account_123',
        gmailId: 'gmail_search3',
        threadId: null,
        subject: 'Newsletter',
        sender: 'newsletter@company.com',
        recipient: 'me@example.com',
        preview: 'Latest updates from our team',
        timestamp: new Date('2024-01-03'),
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    it('should search by subject', async () => {
      mockPrisma.email.findMany.mockResolvedValue([mockSearchEmails[0]])

      const results = await repository.searchEmails('meeting')

      expect(results).toHaveLength(1)
      expect(results[0].subject).toContain('Meeting')
    })

    it('should search by sender', async () => {
      mockPrisma.email.findMany.mockResolvedValue([mockSearchEmails[0]])

      const results = await repository.searchEmails('boss')

      expect(results).toHaveLength(1)
      expect(results[0].sender).toContain('boss@company.com')
    })

    it('should search by preview', async () => {
      mockPrisma.email.findMany.mockResolvedValue([mockSearchEmails[0]])

      const results = await repository.searchEmails('quarterly report')

      expect(results).toHaveLength(1)
      expect(results[0].preview).toContain('quarterly report')
    })

    it('should be case insensitive', async () => {
      mockPrisma.email.findMany.mockResolvedValue([mockSearchEmails[0]])

      await repository.searchEmails('MEETING')

      expect(mockPrisma.email.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                subject: { contains: 'MEETING', mode: 'insensitive' }
              })
            ])
          })
        })
      )
    })

    it('should search across multiple fields', async () => {
      const companyEmails = [mockSearchEmails[0], mockSearchEmails[2]]
      mockPrisma.email.findMany.mockResolvedValue(companyEmails)

      const results = await repository.searchEmails('company')

      expect(results.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by accountId', async () => {
      mockPrisma.email.findMany.mockResolvedValue([mockSearchEmails[0]])

      await repository.searchEmails('meeting', {
        accountId: 'account_123'
      })

      expect(mockPrisma.email.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: 'account_123'
          })
        })
      )
    })

    it('should respect limit parameter', async () => {
      mockPrisma.email.findMany.mockResolvedValue([mockSearchEmails[0]])

      await repository.searchEmails('company', { limit: 1 })

      expect(mockPrisma.email.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1
        })
      )
    })

    it('should return empty array if no matches', async () => {
      mockPrisma.email.findMany.mockResolvedValue([])

      const results = await repository.searchEmails('nonexistent search term xyz')

      expect(results).toHaveLength(0)
    })

    it('should order results by timestamp DESC', async () => {
      mockPrisma.email.findMany.mockResolvedValue(mockSearchEmails)

      await repository.searchEmails('example.com')

      expect(mockPrisma.email.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' }
        })
      )
    })
  })
})
