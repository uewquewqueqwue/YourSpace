import express from 'express'
import { prisma } from '../prisma'
import { authenticate } from 'server/middleware/auth'

const router = express.Router()

router.patch('/user/profile', authenticate, async (req: any, res) => {
  try {
    const { name, avatar } = req.body
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, avatar }
    })
    
    const { password: _, ...userWithoutPassword } = updatedUser
    res.json(userWithoutPassword)
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router