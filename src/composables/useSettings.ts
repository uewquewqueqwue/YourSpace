import { onMounted, ref, watch } from 'vue'
import { Settings } from '@/types/settings'

const defaultSettings: Settings = {
  appearance: {
    theme: 'dark',
    animations: true
  },
  notifications: {
    email: true,
  },
  privacy: {
    twoFactorAuth: false
  },
  system: {
    startWithSystem: false,
    minimizeToTray: true,
    autoUpdates: true
  }
}

const loadSettings = (): Settings => {
  const saved = localStorage.getItem('settings')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return defaultSettings
    }
  }
  return defaultSettings
}

export function useSettings() {
  const settings = ref<Settings>(loadSettings())

  watch(settings, () => {
    localStorage.setItem('settings', JSON.stringify(settings.value))
  }, { deep: true })

  const applyTheme = () => {
    const theme = settings.value.appearance.theme
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', systemTheme)
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }

  const applyAnimations = () => {
    if (settings.value.appearance.animations) {
      document.documentElement.classList.remove('no-animations')
    } else {
      document.documentElement.classList.add('no-animations')
    }
  }

  const applyAll = () => {
    applyTheme()
    applyAnimations()
  }

  watch(() => settings.value.appearance.theme, applyTheme)
  watch(() => settings.value.appearance.animations, applyAnimations)

  onMounted(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (settings.value.appearance.theme === 'system') {
        applyTheme()
      }
    })
  })

  return {
    settings,
    applyAll
  }
}