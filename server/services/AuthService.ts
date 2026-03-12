import bcrypt from 'bcrypt'
import { userRepository } from '../repositories/UserRepository'
import { createToken } from '../middleware/auth'
import { AuthenticationError, ConflictError, ValidationError } from '../utils/errors'
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '../utils/validation'
import logger from '../utils/logger'

const SALT_ROUNDS = 10

export class AuthService {
  async login(input: LoginInput) {
    const validated = loginSchema.parse(input)
    
    const user = await userRepository.findByEmail(validated.email)
    if (!user) {
      throw new AuthenticationError('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(validated.password, user.password)
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid credentials')
    }

    const token = createToken(user.id)
    const { password, ...userWithoutPassword } = user

    logger.info(`User logged in: ${user.email}`)
    
    return { user: userWithoutPassword, token }
  }

  async register(input: RegisterInput) {
    const validated = registerSchema.parse(input)

    const exists = await userRepository.exists(validated.email)
    if (exists) {
      throw new ConflictError('User with this email already exists')
    }

    const hashedPassword = await bcrypt.hash(validated.password, SALT_ROUNDS)

    const user = await userRepository.create({
      name: validated.name,
      email: validated.email,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${validated.email}`
    })

    const token = createToken(user.id)
    const { password, ...userWithoutPassword } = user

    logger.info(`New user registered: ${user.email}`)

    return { user: userWithoutPassword, token }
  }

  async updateProfile(userId: string, updates: { name?: string; avatar?: string }) {
    if (!updates.name && !updates.avatar) {
      throw new ValidationError('No updates provided')
    }

    const user = await userRepository.update(userId, updates)
    const { password, ...userWithoutPassword } = user

    logger.info(`User profile updated: ${user.email}`)

    return userWithoutPassword
  }
}

export const authService = new AuthService()
