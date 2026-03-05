import type { Ref } from "vue"

export interface UseClickOutsideOptions {
  element: Ref<HTMLElement | null>
  onOutside: () => void
  onEscape?: () => void
  enabled?: Ref<boolean> | boolean
}

export interface UseModalOptions {
  onClose?: () => void
  closeOnClickOutside?: boolean
  closeOnEscape?: boolean
  initialOpen?: boolean
}

export interface ModalReturn {
  isOpen: Ref<boolean>
  modalRef: Ref<HTMLElement | null>
  overlayRef: Ref<HTMLElement | null>
  open: () => void
  close: () => void
  toggle: () => void
}

export type TabType = 'running' | 'browse'