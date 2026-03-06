import { ref } from 'vue'

const currentVersion = ref('1.0.0')
const appVersion = ref('1.0.0')

export function useVersionStore() {
  const setVersion = (ver: string) => {
    currentVersion.value = ver
  }

  const setAppVersion = (ver: string) => {
    appVersion.value = ver
  }

  return {
    currentVersion,
    appVersion,
    setVersion,
    setAppVersion
  }
}