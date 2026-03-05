import { ipcMain } from 'electron'
import { prisma } from '../prisma'
import { authenticate } from '../middleware/auth'

export function setupCatalogsHandlers() {
  ipcMain.handle('catalogs:getAll', async (event, token) => {
    await authenticate(token)
    return prisma.appCatalog.findMany()
  })

  ipcMain.handle('catalogs:update', async (event, { token, id, displayName, icon, color }) => {
    await authenticate(token)
    
    return prisma.appCatalog.update({
      where: { id },
      data: { displayName, icon, color }
    })
  })
}