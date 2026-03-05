import { prisma } from '../prisma'

export const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })
  
  const user = await prisma.user.findUnique({ where: { id: token } })
  if (!user) return res.status(404).json({ error: 'User not found' })
  
  req.user = user
  next()
}