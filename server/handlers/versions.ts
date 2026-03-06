import { ipcMain } from 'electron'
import { prisma } from '../prisma'

export function setupVersionsHandlers() {
  ipcMain.handle('versions:getLatest', async () => {
    const latestVersion = await prisma.appVersion.findFirst({
      orderBy: { releaseDate: 'desc' },
      include: { patchNotes: { orderBy: { order: 'asc' } } }
    })

    if (!latestVersion) {
      return prisma.appVersion.create({
        data: {
          version: '1.0.0',
          patchNotes: {
            create: [
              { icon: '🚀', title: 'Первый релиз', description: 'Запуск приложения', order: 0 }
            ]
          }
        },
        include: { patchNotes: true }
      })
    }

    return latestVersion
  })

  ipcMain.handle('versions:create', async (event, { version, patchNotes }) => {
    return prisma.appVersion.create({
      data: {
        version,
        patchNotes: {
          create: patchNotes?.map((note: any, index: number) => ({
            icon: note.icon,
            title: note.title,
            description: note.description,
            category: note.category || 'feature',
            order: index
          }))
        }
      },
      include: { patchNotes: true }
    })
  })
}