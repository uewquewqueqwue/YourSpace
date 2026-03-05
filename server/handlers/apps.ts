import { ipcMain } from 'electron'
import { prisma } from '../prisma'
import { authenticate } from '../middleware/auth'
import { generateColor } from '../../src/utils/generateColor'

export function setupAppsHandlers() {
  ipcMain.handle('apps:getAll', async (event, token) => {
    const user = await authenticate(token)
    
    const apps = await prisma.userApp.findMany({
      where: { userId: user.id },
      include: { catalog: true }
    })

    return apps.map(app => ({
      ...app,
      displayName: app.customName || app.catalog.displayName || app.catalog.name,
      displayColor: app.customColor || app.catalog.color
    }))
  })

  ipcMain.handle('apps:create', async (event, { token, path, catalogName, customName, customColor, totalMinutes = 0 }) => {
    const user = await authenticate(token)
    
    let catalog = await prisma.appCatalog.findUnique({
      where: { name: catalogName }
    })
    
    if (!catalog) {
      catalog = await prisma.appCatalog.create({
        data: {
          name: catalogName,
          displayName: catalogName,
          color: generateColor(catalogName)
        }
      })
    }
    
    const userApp = await prisma.userApp.create({
      data: {
        userId: user.id,
        catalogId: catalog.id,
        path,
        customName,
        customColor,
        totalMinutes,
        lastUsed: new Date()
      },
      include: { catalog: true }
    })
    
    return {
      ...userApp,
      displayName: userApp.customName || userApp.catalog.displayName || userApp.catalog.name,
      displayColor: userApp.customColor || userApp.catalog.color
    }
  })

  ipcMain.handle('apps:update', async (event, { token, id, totalMinutes, lastUsed }) => {
    const user = await authenticate(token)
    
    const userApp = await prisma.userApp.update({
      where: { 
        id,
        userId: user.id 
      },
      data: { 
        totalMinutes,
        lastUsed: lastUsed ? new Date(lastUsed) : undefined
      },
      include: { catalog: true }
    })
    
    return {
      ...userApp,
      displayName: userApp.customName || userApp.catalog.displayName || userApp.catalog.name,
      displayColor: userApp.customColor || userApp.catalog.color
    }
  })

  ipcMain.handle('apps:delete', async (event, { token, id }) => {
    const user = await authenticate(token)
    
    await prisma.userApp.delete({
      where: { id, userId: user.id }
    })
    
    return { success: true }
  })
}