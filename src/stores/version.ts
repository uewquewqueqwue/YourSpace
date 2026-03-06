import { ref } from 'vue'

const currentVersion = ref('1.1.1')

export function useVersionStore() {
  const setVersion = (ver: string) => {
    currentVersion.value = ver
  }

  return {
    currentVersion: currentVersion,
    setVersion
  }
}