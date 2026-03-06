import fs from 'fs'
import path from 'path'

const exeDir = path.dirname(process.execPath)
const logPath = path.join(exeDir, 'debug.log')

function writeDebug(msg: string) {
  try {
    fs.appendFileSync(logPath, new Date().toISOString() + ' ' + msg + '\n')
  } catch (e) {
  }
}

writeDebug('========== START ==========')
writeDebug('execPath: ' + process.execPath)
writeDebug('resourcesPath: ' + process.resourcesPath)
writeDebug('cwd: ' + process.cwd())

// Ищем .env
const paths = [
  path.join(process.resourcesPath || '', '.env'),
  path.join(path.dirname(process.execPath), 'resources', '.env'),
  path.join(path.dirname(process.execPath), '.env'),
]

let loaded = false
for (const p of paths) {
  writeDebug('Checking: ' + p)
  if (fs.existsSync(p)) {
    writeDebug('FOUND: ' + p)
    const content = fs.readFileSync(p, 'utf8')
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+?)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const val = match[2].trim().replace(/^["']|["']$/g, '')
        process.env[key] = val
        writeDebug(`SET: ${key}=${val.substring(0, 10)}...`)
      }
    })
    loaded = true
    break
  }
}

writeDebug('DATABASE_URL after load: ' + (process.env.DATABASE_URL ? 'YES' : 'NO'))
writeDebug('========== END ==========')

export function loadEnv() {
  return loaded
}