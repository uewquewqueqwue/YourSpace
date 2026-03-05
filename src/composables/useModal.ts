import { ref } from 'vue'
import type { UseModalOptions, ModalReturn } from '@/types/windowOptions'
import { useClickOutside } from '@/composables/useClickOutside'

export function useModal(options: UseModalOptions = {}): ModalReturn {
  const {
    onClose,
    closeOnClickOutside = true,
    closeOnEscape = true,
    initialOpen = false
  } = options

  const isOpen = ref<boolean>(initialOpen)
  const modalRef = ref<HTMLElement | null>(null)
  const overlayRef = ref<HTMLElement | null>(null)

  const open = (): void => {
    isOpen.value = true
  }

  const close = (): void => {
    isOpen.value = false
    onClose?.()
  }

  const toggle = (): void => {
    isOpen.value ? close() : open()
  }

  useClickOutside({
    element: modalRef,
    overlay: overlayRef,
    onOutside: closeOnClickOutside ? close : () => {},
    onEscape: closeOnEscape ? close : undefined,
    enabled: isOpen
  })

  return {
    isOpen,
    modalRef,
    overlayRef,
    open,
    close,
    toggle
  }
}