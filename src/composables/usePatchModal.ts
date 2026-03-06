import { ref } from 'vue'
import { usePatches } from './usePatches'
import { useVersionStore } from '@/stores/version'

const PATCH_SEEN_KEY = 'patch_seen_version'

export function usePatchModal() {
  const patches = usePatches()
  const versionStore = useVersionStore()
  const showPatchModal = ref(false)

  const checkPatches = async () => {
    await patches.fetchPatches()
    versionStore.setCurrentVersion(patches.currentVersion.value)
    
    const lastSeen = localStorage.getItem(PATCH_SEEN_KEY)
    if (patches.currentVersion.value === versionStore.appVersion.value && 
        lastSeen !== patches.currentVersion.value) {
      showPatchModal.value = true
    }
  }

  const markPatchesAsSeen = () => {
    localStorage.setItem(PATCH_SEEN_KEY, patches.currentVersion.value)
    showPatchModal.value = false
  }

  return {
    showPatchModal,
    checkPatches,
    markPatchesAsSeen
  }
}