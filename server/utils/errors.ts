import logger from './logger'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, true)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, true)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, true)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true)
  }
}

export function handleError(error: unknown, context: string): never {
  if (error instanceof AppError) {
    logger.error(`[${context}] ${error.message}`, { statusCode: error.statusCode })
    throw error
  }
  
  if (error instanceof Error) {
    logger.error(`[${context}] ${error.message}`, { stack: error.stack })
    throw new AppError(error.message, 500, false)
  }
  
  logger.error(`[${context}] Unknown error`, { error })
  throw new AppError('Internal server error', 500, false)
}
