import { useAuth } from '@/stores/auth'
import { useAppsStore } from '@/stores/apps'
import { useSettings } from './useSettings'
import { useVersionStore } from '@/stores/version'
import packageJson from '../../package.json'

export function useAppInit() {
  const auth = useAuth()
  const appsStore = useAppsStore()
  const versionStore = useVersionStore()
  const { applyAll } = useSettings()

  const init = async () => {
    applyAll()
    versionStore.setAppVersion(packageJson.version)

    await auth.checkAuth()
    
    if (auth.user.value) {
      appsStore.startPeriodicSync()
    }

    window.electronAPI?.expandWindow()

    window.electronAPI?.onAppClosing(async () => {
      const token = localStorage.getItem('token')
      if (auth.user.value && token) {
        await appsStore.forceSync(token)
      } else {
        appsStore.saveToStorage()
      }
    })
  }

  return { init }
}