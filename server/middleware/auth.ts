import { prisma } from '@server/prisma'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/secrets'

export const sessions = new Map<string, any>()

export async function authenticate(token: string) {
  if (!token) throw new Error('No token')
  
  if (sessions.has(token)) {
    return sessions.get(token)
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: string }
    
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.userId } 
    })
    
    if (!user) throw new Error('User not found')
    
    const { password, ...userWithoutPassword } = user
    sessions.set(token, userWithoutPassword)
    
    return userWithoutPassword
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export function createToken(userId: string): string {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}