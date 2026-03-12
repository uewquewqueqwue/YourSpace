import { RateLimitError } from './errors'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimits = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key)
    }
  }
}, 5 * 60 * 1000)

export function rateLimit(
  key: string, 
  maxRequests: number, 
  windowMs: number
): void {
  const now = Date.now()
  const limit = rateLimits.get(key)
  
  if (!limit || now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  
  if (limit.count >= maxRequests) {
    throw new RateLimitError(`Too many requests. Please try again later.`)
  }
  
  limit.count++
}

export function clearRateLimit(key: string): void {
  rateLimits.delete(key)
}
