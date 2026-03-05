import { ipcRenderer } from 'electron'

const originalConsole = { ...console }

const sendToMain = (level: string, ...args: any[]) => {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    }
    return String(arg)
  }).join(' ')
  
  ipcRenderer.send('log', { level, message, timestamp: Date.now() })
}

export function setupLogger() {
  console.log = (...args: any[]) => {
    sendToMain('info', ...args)
    originalConsole.log(...args)
  }

  console.error = (...args: any[]) => {
    sendToMain('error', ...args)
    originalConsole.error(...args)
  }

  console.warn = (...args: any[]) => {
    sendToMain('warn', ...args)
    originalConsole.warn(...args)
  }

  console.info = (...args: any[]) => {
    sendToMain('info', ...args)
    originalConsole.info(...args)
  }

  return {
    log: (level: 'info' | 'error' | 'warn', ...args: any[]) => {
      sendToMain(level, ...args)
    }
  }
}