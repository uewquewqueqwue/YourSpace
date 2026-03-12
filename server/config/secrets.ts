import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

interface AppConfig {
  jwtSecret: string
  firstRun: boolean
  version: string
}

export function getOrCreateConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
      return config
    }
  } catch (error) {
    console.error('Failed to read config:', error)
  }

  // Первый запуск - генерируем секреты
  const config: AppConfig = {
    jwtSecret: crypto.randomBytes(64).toString('hex'),
    firstRun: true,
    version: app.getVersion()
  }

  try {
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to write config:', error)
  }

  return config
}

// Экспортируем секреты
const config = getOrCreateConfig()

export const JWT_SECRET = process.env.JWT_SECRET || config.jwtSecret
export const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined')
}

export const IS_FIRST_RUN = config.firstRun

// Обновляем флаг первого запуска
if (config.firstRun) {
  config.firstRun = false
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Failed to update config:', error)
  }
}
