import { ipcMain } from 'electron'
import { prisma } from '../prisma'

export function setupCatalogsHandlers() {
  ipcMain.handle('catalogs:getAll', async () => {
    return prisma.appCatalog.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        icon: true,
        color: true
      }
    })
  })

  ipcMain.handle('catalogs:create', async (event, { name, displayName, color }) => {
    return prisma.appCatalog.create({
      data: {
        name,
        displayName: displayName || name,
        color
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        icon: true,
        color: true
      }
    })
  })
}