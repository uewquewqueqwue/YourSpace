export interface Settings {
  appearance: {
    theme: 'light' | 'dark' | 'system'
    animations: boolean
  }
  notifications: {
    email: boolean
  }
  privacy: {
    twoFactorAuth: boolean
  }
  system: {
    startWithSystem: boolean
    minimizeToTray: boolean
    autoUpdates: boolean
  }
}