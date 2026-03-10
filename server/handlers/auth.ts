import { ipcMain } from 'electron'
import { prisma } from '../prisma'
import { authenticate, createToken, sessions } from '../middleware/auth'


export function setupAuthHandlers() {
  ipcMain.handle('auth:login', async (event, { email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || user.password !== password) {
      throw new Error('Invalid credentials')
    }

    const token = createToken(user.id)

    const { password: _, ...userWithoutPassword } = user
    sessions.set(token, userWithoutPassword)

    return { user: userWithoutPassword, token }
  })

  ipcMain.handle('auth:register', async (event, { name, email, password }) => {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new Error('User already exists')

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${email}`
      }
    })

    const token = createToken(newUser.id)

    const { password: _, ...userWithoutPassword } = newUser
    sessions.set(token, userWithoutPassword)

    return { user: userWithoutPassword, token }
  })

  ipcMain.handle('auth:logout', async (event, token) => {
    sessions.delete(token)
    return { success: true }
  })

  ipcMain.handle('auth:me', async (event, token) => {
    return authenticate(token)
  })

  ipcMain.handle('auth:updateProfile', async (event, { token, ...updates }) => {
    const user = await authenticate(token)

    const data: any = {}
    if (updates.name !== undefined) data.name = updates.name
    if (updates.avatar !== undefined) data.avatar = updates.avatar

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data
    })

    const { password: _, ...userWithoutPassword } = updatedUser
    sessions.set(token, userWithoutPassword)

    return userWithoutPassword
  })
}