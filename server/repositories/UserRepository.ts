import { prisma } from '../prisma'
import type { User } from '../../generated/client'

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  }

  async create(data: {
    name: string
    email: string
    password: string
    avatar?: string
  }): Promise<User> {
    return prisma.user.create({ data })
  }

  async update(id: string, data: {
    name?: string
    avatar?: string
    password?: string
  }): Promise<User> {
    return prisma.user.update({
      where: { id },
      data
    })
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } })
  }

  async exists(email: string): Promise<boolean> {
    const count = await prisma.user.count({ where: { email } })
    return count > 0
  }
}

export const userRepository = new UserRepository()
