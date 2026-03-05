import express from 'express'
import { prisma } from '../prisma'

const router = express.Router()

router.get('/version/latest', async (req, res) => {
  try {
    const latestVersion = await prisma.appVersion.findFirst({
      orderBy: {
        releaseDate: 'desc'
      },
      include: {
        patchNotes: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!latestVersion) {
      const defaultVersion = await prisma.appVersion.create({
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
      return res.json(defaultVersion)
    }

    res.json(latestVersion)
  } catch (error) {
    console.error('Error fetching latest version:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/version', async (req, res) => {
  try {
    const { version, patchNotes } = req.body

    const newVersion = await prisma.appVersion.create({
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
      include: {
        patchNotes: true
      }
    })

    res.json(newVersion)
  } catch (error) {
    console.error('Error creating version:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router