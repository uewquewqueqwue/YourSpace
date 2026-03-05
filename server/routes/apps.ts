import express from 'express'
import { prisma } from '../prisma'
import { authenticate } from 'server/middleware/auth'
import { generateColor } from '@/utils/generateColor'

const router = express.Router()

router.get('/catalogs', authenticate, async (req, res) => {
  const catalogs = await prisma.appCatalog.findMany()
  res.json(catalogs)
})

router.patch('/catalogs/:id', authenticate, async (req: any, res) => {
  const { displayName, icon, color } = req.body
  const catalog = await prisma.appCatalog.update({
    where: { id: req.params.id },
    data: { displayName, icon, color }
  })
  res.json(catalog)
})

router.get('/apps', authenticate, async (req: any, res) => {
  const apps = await prisma.userApp.findMany({
    where: { userId: req.user.id },
    include: { catalog: true }
  })

  const appsWithDisplay = apps.map(app => ({
    ...app,
    displayName: app.customName || app.catalog.displayName || app.catalog.name,
    displayColor: app.customColor || app.catalog.color
  }))

  res.json(appsWithDisplay)
})

router.post('/apps', authenticate, async (req: any, res) => {
  try {
    const { path, catalogName, customName, customColor, totalMinutes = 0 } = req.body
    
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
        userId: req.user.id,
        catalogId: catalog.id,
        path,
        customName,
        customColor,
        totalMinutes,
        lastUsed: new Date()
      },
      include: { catalog: true }
    })
    
    res.json({
      ...userApp,
      displayName: userApp.customName || userApp.catalog.displayName || userApp.catalog.name,
      displayColor: userApp.customColor || userApp.catalog.color
    })
  } catch (error) {
    console.error('Create app error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/apps/:id', authenticate, async (req: any, res) => {
  try {
    const { totalMinutes, lastUsed } = req.body
    
    const userApp = await prisma.userApp.update({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      },
      data: { 
        totalMinutes,
        lastUsed: lastUsed ? new Date(lastUsed) : undefined
      },
      include: { catalog: true }
    })
    
    res.json({
      ...userApp,
      displayName: userApp.customName || userApp.catalog.displayName || userApp.catalog.name,
      displayColor: userApp.customColor || userApp.catalog.color
    })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'App not found' })
    }
    
    console.error('Update app error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router