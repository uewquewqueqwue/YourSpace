import { ipcMain } from 'electron'
import { authenticate, sessions } from '../middleware/auth'
import { authService } from '../services/AuthService'
import { handleError } from '../utils/errors'
import { rateLimit } from '../utils/rateLimit'
import { z } from 'zod'

export function setupAuthHandlers() {
  ipcMain.handle('auth:login', async (event, data) => {
    try {
      // Rate limit: 5 attempts per minute per email
      const email = data?.email || 'unknown'
      rateLimit(`login:${email}`, 5, 60000)

      const result = await authService.login(data)
      sessions.set(result.token, result.user)
      
      return result
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message)
      }
      handleError(error, 'auth:login')
    }
  })

  ipcMain.handle('auth:register', async (event, data) => {
    try {
      // Rate limit: 3 registrations per hour per IP (using email as proxy)
      const email = data?.email || 'unknown'
      rateLimit(`register:${email}`, 3, 3600000)

      const result = await authService.register(data)
      sessions.set(result.token, result.user)
      
      return result
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0].message)
      }
      handleError(error, 'auth:register')
    }
  })

  ipcMain.handle('auth:logout', async (event, token) => {
    try {
      if (token) {
        sessions.delete(token)
      }
      return { success: true }
    } catch (error) {
      handleError(error, 'auth:logout')
    }
  })

  ipcMain.handle('auth:me', async (event, token) => {
    try {
      return await authenticate(token)
    } catch (error) {
      handleError(error, 'auth:me')
    }
  })

  ipcMain.handle('auth:updateProfile', async (event, { token, ...updates }) => {
    try {
      const user = await authenticate(token)
      const updatedUser = await authService.updateProfile(user.id, updates)
      
      sessions.set(token, updatedUser)
      
      return updatedUser
    } catch (error) {
      handleError(error, 'auth:updateProfile')
    }
  })
}