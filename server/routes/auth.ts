import express from 'express'
import { prisma } from '../prisma'

const router = express.Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  
  const { password: _, ...userWithoutPassword } = user
  res.json({ user: userWithoutPassword, token: user.id })
})

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const newUser = await prisma.user.create({
      data: { 
        name, 
        email, 
        password,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`
      }
    })
    
    const { password: _, ...userWithoutPassword } = newUser
    res.json({ user: userWithoutPassword, token: newUser.id })
  } catch (error) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', async (req: any, res) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  
  const user = await prisma.user.findUnique({ where: { id: token } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  
  const { password: _, ...userWithoutPassword } = user
  res.json(userWithoutPassword)
})

export default router