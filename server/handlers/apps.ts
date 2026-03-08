import { ipcMain } from 'electron'
import { prisma } from '../prisma'
import { authenticate } from '../middleware/auth'

export function setupAppsHandlers() {
  ipcMain.handle('apps:getAll', async (event, token) => {
    const user = await authenticate(token)

    return prisma.userApp.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        path: true,
        customName: true,
        customColor: true,
        totalMinutes: true,
        lastUsed: true,
        catalog: {
          select: {
            id: true,
            name: true,
            displayName: true,
            icon: true,
            color: true
          }
        }
      }
    })
  })

  ipcMain.handle('apps:create', async (event, { token, path, catalogName, customName, customColor }) => {
    const user = await authenticate(token)
    const exeName = path.split('\\').pop()?.replace('.exe', '') || catalogName

    return prisma.$transaction(async (tx) => {
      let catalog = await tx.appCatalog.findUnique({
        where: { name: exeName }
      })

      if (!catalog) {
        catalog = await tx.appCatalog.create({
          data: {
            name: exeName,
          }
        })
      }

      return tx.userApp.create({
        data: {
          userId: user.id,
          catalogId: catalog.id,
          path,
          customName,
          customColor,
          lastUsed: new Date()
        },
        select: {
          id: true,
          path: true,
          customName: true,
          customColor: true,
          totalMinutes: true,
          lastUsed: true,
          catalog: {
            select: {
              id: true,
              name: true,
              displayName: true,
              icon: true,
              color: true
            }
          }
        }
      })
    })
  })

  ipcMain.handle('apps:update', async (event, { token, id, totalMinutes, lastUsed }) => {
    const user = await authenticate(token)

    return prisma.userApp.update({
      where: { id, userId: user.id },
      data: {
        totalMinutes,
        lastUsed: lastUsed ? new Date(lastUsed) : undefined
      },
      select: {
        id: true,
        totalMinutes: true,
        lastUsed: true
      }
    })
  })

  ipcMain.handle('apps:delete', async (event, { token, id }) => {
    const user = await authenticate(token)

    await prisma.userApp.delete({
      where: { id, userId: user.id }
    })

    return { success: true }
  })
}