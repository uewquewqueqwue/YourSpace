const colors = {
  info: '\x1b[36m',
  error: '\x1b[31m',
  warn: '\x1b[33m',
  success: '\x1b[32m',
  gray: '\x1b[90m',
  reset: '\x1b[0m'
}

const getTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const ms = now.getMilliseconds().toString().padStart(3, '0')
  return `${colors.gray}${hours}:${minutes}:${seconds}.${ms}${colors.reset}`
}

export const mainLog = {
  info: (...args: any[]) => {
    console.log(`${getTime()} ${colors.info}[Main]${colors.reset}`, ...args)
  },
  error: (...args: any[]) => {
    console.error(`${getTime()} ${colors.error}[Main]${colors.reset}`, ...args)
  },
  warn: (...args: any[]) => {
    console.warn(`${getTime()} ${colors.warn}[Main]${colors.reset}`, ...args)
  },
  success: (...args: any[]) => {
    console.log(`${getTime()} ${colors.success}[Main]${colors.reset}`, ...args)
  }
}