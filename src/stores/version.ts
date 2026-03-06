import { ref } from 'vue'

const appVersion = ref('1.0.0')
const currentVersion = ref('1.0.0')
const isUpdateReady = ref(false)

export function useVersionStore() {
  const setAppVersion = (ver: string) => {
    appVersion.value = ver
  }

  const setCurrentVersion = (ver: string) => {
    currentVersion.value = ver
  }

  const setUpdateReady = (ready: boolean) => {
    isUpdateReady.value = ready
  }

  return {
    appVersion,
    currentVersion,
    isUpdateReady,
    setAppVersion,
    setCurrentVersion,
    setUpdateReady
  }
}