import { prisma } from '../prisma'
import type { Email } from '../../generated/client'

interface CreateEmailData {
  accountId: string
  gmailId: string
  threadId?: string
  subject: string
  sender: string
  recipient: string
  preview: string
  timestamp: Date
  isRead?: boolean
}

interface EmailFilters {
  accountId?: string
  isRead?: boolean
  limit?: number
  offset?: number
}

interface SearchFilters {
  accountId?: string
  limit?: number
}

export class EmailRepository {
  /**
   * Create a new email with duplicate check by gmailId
   * If email with same gmailId exists, returns existing email
   * Requirements: 4.1, 4.3
   */
  async createEmail(data: CreateEmailData): Promise<Email> {
    // Check for existing email by gmailId
    const existing = await this.findByGmailId(data.gmailId)
    if (existing) {
      return existing
    }

    return prisma.email.create({
      data: {
        accountId: data.accountId,
        gmailId: data.gmailId,
        threadId: data.threadId,
        subject: data.subject,
        sender: data.sender,
        recipient: data.recipient,
        preview: data.preview,
        timestamp: data.timestamp,
        isRead: data.isRead ?? false
      }
    })
  }

  /**
   * Find email by Gmail message ID for deduplication
   * Requirements: 4.3
   */
  async findByGmailId(gmailId: string): Promise<Email | null> {
    return prisma.email.findUnique({
      where: { gmailId }
    })
  }

  /**
   * Find email by database ID
   */
  async findById(id: string): Promise<Email | null> {
    return prisma.email.findUnique({
      where: { id }
    })
  }

  /**
   * List emails with filters (accountId, isRead, pagination)
   * Returns emails ordered by timestamp DESC (newest first)
   * Requirements: 4.2, 4.4
   */
  async listEmails(filters: EmailFilters): Promise<{ emails: Email[]; total: number }> {
    const where: any = {}

    if (filters.accountId) {
      where.accountId = filters.accountId
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit,
        skip: filters.offset
      }),
      prisma.email.count({ where })
    ])

    return { emails, total }
  }

  /**
   * Update read status of an email
   * Requirements: 4.4
   */
  async updateReadStatus(emailId: string, isRead: boolean): Promise<Email> {
    return prisma.email.update({
      where: { id: emailId },
      data: { isRead }
    })
  }

  /**
   * Delete all emails for a specific account (cascade deletion)
   * Returns count of deleted emails
   * Requirements: 4.5
   */
  async deleteByAccount(accountId: string): Promise<number> {
    const result = await prisma.email.deleteMany({
      where: { accountId }
    })
    return result.count
  }

  /**
   * Search emails with ILIKE across subject, sender, preview
   * Requirements: 8.1
   */
  async searchEmails(query: string, filters: SearchFilters = {}): Promise<Email[]> {
    const where: any = {
      OR: [
        { subject: { contains: query, mode: 'insensitive' } },
        { sender: { contains: query, mode: 'insensitive' } },
        { preview: { contains: query, mode: 'insensitive' } }
      ]
    }

    if (filters.accountId) {
      where.accountId = filters.accountId
    }

    return prisma.email.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit
    })
  }

  /**
   * Count unread emails across specified accounts
   */
  async countUnread(accountIds: string[]): Promise<number> {
    return prisma.email.count({
      where: {
        accountId: { in: accountIds },
        isRead: false
      }
    })
  }
}

export const emailRepository = new EmailRepository()
