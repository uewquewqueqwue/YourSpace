import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100)
})

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url('Invalid avatar URL').optional()
})

export const createAppSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  catalogName: z.string().min(1),
  customName: z.string().max(100).optional(),
  customColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  totalMinutes: z.number().min(0).optional()
})

export const updateAppSchema = z.object({
  totalMinutes: z.number().min(0).optional(),
  lastUsed: z.date().optional()
})

export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.date().optional(),
  folderId: z.string().optional(),
  position: z.number().min(0)
})

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.date().optional(),
  completed: z.boolean().optional(),
  folderId: z.string().optional(),
  position: z.number().min(0).optional()
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type CreateAppInput = z.infer<typeof createAppSchema>
export type UpdateAppInput = z.infer<typeof updateAppSchema>
export type CreateTodoInput = z.infer<typeof createTodoSchema>
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>
