import { prisma } from '../prisma'
import type { UserApp, AppCatalog } from '../../generated/client'

export class AppRepository {
  async findAllByUserId(userId: string) {
    return prisma.userApp.findMany({
      where: { userId },
      include: {
        catalog: true
      },
      orderBy: { lastUsed: 'desc' }
    })
  }

  async findById(id: string, userId: string) {
    return prisma.userApp.findFirst({
      where: { id, userId },
      include: { catalog: true }
    })
  }

  async findByPath(userId: string, path: string) {
    return prisma.userApp.findFirst({
      where: { userId, path }
    })
  }

  async create(data: {
    userId: string
    catalogId: string
    path: string
    customName?: string
    customColor?: string
    totalMinutes?: number
  }) {
    return prisma.userApp.create({
      data: {
        ...data,
        lastUsed: new Date()
      },
      include: { catalog: true }
    })
  }

  async update(id: string, userId: string, data: {
    totalMinutes?: number
    lastUsed?: Date
    customName?: string
    customColor?: string
  }) {
    return prisma.userApp.update({
      where: { id, userId },
      data,
      include: { catalog: true }
    })
  }

  async delete(id: string, userId: string): Promise<void> {
    await prisma.userApp.delete({
      where: { id, userId }
    })
  }

  async findCatalogByName(name: string): Promise<AppCatalog | null> {
    return prisma.appCatalog.findUnique({
      where: { name }
    })
  }

  async createCatalog(data: {
    name: string
    displayName?: string
    icon?: string
    color?: string
  }): Promise<AppCatalog> {
    return prisma.appCatalog.create({ data })
  }

  async getAllCatalogs(): Promise<AppCatalog[]> {
    return prisma.appCatalog.findMany({
      orderBy: { name: 'asc' }
    })
  }

  async updateCatalog(id: string, data: {
    displayName?: string
    icon?: string
    color?: string
  }): Promise<AppCatalog> {
    return prisma.appCatalog.update({
      where: { id },
      data
    })
  }
}

export const appRepository = new AppRepository()
