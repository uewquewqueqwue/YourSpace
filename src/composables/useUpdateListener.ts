import { onMounted, onUnmounted } from 'vue'
import { useVersionStore } from '@/stores/version'

export function useUpdateListener() {
  const versionStore = useVersionStore()

  onMounted(() => {
    window.electronAPI?.onUpdateDownloaded(() => {
      versionStore.setUpdateReady(true)
    })

    window.addEventListener('open-patch-notes', () => {
      window.dispatchEvent(new CustomEvent('open-patch-modal'))
    })
  })

  onUnmounted(() => {
    window.removeEventListener('open-patch-notes', () => {})
  })
}