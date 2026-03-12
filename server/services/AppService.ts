import { appRepository } from '../repositories/AppRepository'
import { NotFoundError, ConflictError } from '../utils/errors'
import { createAppSchema, updateAppSchema } from '../utils/validation'
import { prisma } from '../prisma'
import logger from '../utils/logger'

export class AppService {
  async getAllApps(userId: string) {
    return appRepository.findAllByUserId(userId)
  }

  async getAppById(id: string, userId: string) {
    const app = await appRepository.findById(id, userId)
    if (!app) {
      throw new NotFoundError('App not found')
    }
    return app
  }

  async createApp(userId: string, input: {
    path: string
    catalogName: string
    customName?: string
    customColor?: string
    totalMinutes?: number
  }) {
    const validated = createAppSchema.parse(input)

    // Check if app already exists for this user
    const existing = await appRepository.findByPath(userId, validated.path)
    if (existing) {
      throw new ConflictError('App already added')
    }

    // Use transaction to ensure catalog and app are created atomically
    return prisma.$transaction(async (tx) => {
      const exeName = validated.path.split('\\').pop()?.replace('.exe', '') || validated.catalogName

      let catalog = await appRepository.findCatalogByName(exeName)

      if (!catalog) {
        catalog = await appRepository.createCatalog({
          name: exeName
        })
      }

      const app = await appRepository.create({
        userId,
        catalogId: catalog.id,
        path: validated.path,
        customName: validated.customName,
        customColor: validated.customColor,
        totalMinutes: validated.totalMinutes || 0
      })

      logger.info(`App created for user ${userId}: ${validated.path}`)

      return app
    })
  }

  async updateApp(id: string, userId: string, updates: {
    totalMinutes?: number
    lastUsed?: Date
  }) {
    const validated = updateAppSchema.parse(updates)

    const app = await appRepository.findById(id, userId)
    if (!app) {
      throw new NotFoundError('App not found')
    }

    return appRepository.update(id, userId, validated)
  }

  async deleteApp(id: string, userId: string) {
    const app = await appRepository.findById(id, userId)
    if (!app) {
      throw new NotFoundError('App not found')
    }

    await appRepository.delete(id, userId)
    logger.info(`App deleted for user ${userId}: ${id}`)
  }

  async getAllCatalogs() {
    return appRepository.getAllCatalogs()
  }

  async createCatalog(data: {
    name: string
    displayName?: string | null
    color?: string | null
  }) {
    const existing = await appRepository.findCatalogByName(data.name)
    if (existing) {
      throw new ConflictError('Catalog already exists')
    }

    return appRepository.createCatalog({
      name: data.name,
      displayName: data.displayName || undefined,
      color: data.color || undefined
    })
  }

  async updateCatalog(id: string, data: {
    displayName?: string
    icon?: string
    color?: string
  }) {
    return appRepository.updateCatalog(id, data)
  }
}

export const appService = new AppService()
