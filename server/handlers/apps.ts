import { ipcMain } from 'electron'
import { authenticate } from '../middleware/auth'
import { appService } from '../services/AppService'
import { handleError } from '../utils/errors'
import { z } from 'zod'

export function setupAppsHandlers() {
  ipcMain.handle('apps:getAll', async (event, token) => {
    try {
      const user = await authenticate(token)
      return await appService.getAllApps(user.id)
    } catch (error) {
      handleError(error, 'apps:getAll')
    }
  })

  ipcMain.handle('apps:create', async (event, { token, ...data }) => {
    try {
      const user = await authenticate(token)
      return await appService.createApp(user.id, data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message)
      }
      handleError(error, 'apps:create')
    }
  })

  ipcMain.handle('apps:update', async (event, { token, id, ...updates }) => {
    try {
      const user = await authenticate(token)
      
      // Convert lastUsed string to Date if present
      if (updates.lastUsed && typeof updates.lastUsed === 'string') {
        updates.lastUsed = new Date(updates.lastUsed)
      }
      
      return await appService.updateApp(id, user.id, updates)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message)
      }
      handleError(error, 'apps:update')
    }
  })

  ipcMain.handle('apps:delete', async (event, { token, id }) => {
    try {
      const user = await authenticate(token)
      await appService.deleteApp(id, user.id)
      return { success: true }
    } catch (error) {
      handleError(error, 'apps:delete')
    }
  })
}