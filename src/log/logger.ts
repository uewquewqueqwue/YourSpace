export const log = (level: 'info' | 'error' | 'warn', ...args: any[]) => {
  if (window.electronAPI?.log) {
    window.electronAPI.log(level, ...args)
  } else {
    console[level](...args)
  }
}