import { onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export interface UseClickOutsideOptions {
  element: Ref<HTMLElement | null>
  overlay?: Ref<HTMLElement | null>
  onOutside: () => void
  onEscape?: () => void
  enabled?: boolean | Ref<boolean>
}

export function useClickOutside({
  element,
  overlay,
  onOutside,
  onEscape,
  enabled = true
}: UseClickOutsideOptions) {

  const isEnabled = (): boolean => {
    if (typeof enabled === 'boolean') return enabled
    if (enabled && typeof enabled === 'object' && 'value' in enabled) return enabled.value
    return true
  }


  const handleClick = (e: MouseEvent): void => {
    if (!isEnabled()) return

    const target = e.target as Node


    if (target instanceof HTMLElement && target.classList.contains('modal-overlay')) {
      onOutside()
      return
    }


    if (element.value && !element.value.contains(target)) {
      onOutside()
      return
    }
  }

  const handleEscape = (e: KeyboardEvent): void => {
    if (!isEnabled()) return
    if (e.key === 'Escape' && onEscape) {
      onEscape()
    }
  }

  onMounted((): void => {
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleEscape)
  })

  onUnmounted((): void => {
    document.removeEventListener('click', handleClick)
    document.removeEventListener('keydown', handleEscape)
  })

  return {
    disable: (): void => {
      if (typeof enabled === 'object' && 'value' in enabled) {
        enabled.value = false
      }
    },
    enable: (): void => {
      if (typeof enabled === 'object' && 'value' in enabled) {
        enabled.value = true
      }
    }
  }
}