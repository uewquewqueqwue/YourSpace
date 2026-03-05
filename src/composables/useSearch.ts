import { useModal } from './useModal'

let searchInstance: ReturnType<typeof createSearch> | null = null

function createSearch() {
  const modal = useModal({
    closeOnClickOutside: true,
    closeOnEscape: true
  })

  const openSearch = () => modal.open()
  const closeSearch = () => modal.close()

  return {
    isOpen: modal.isOpen,
    modalRef: modal.modalRef,
    openSearch,
    closeSearch
  }
}

export function useSearch() {
  if (!searchInstance) {
    searchInstance = createSearch()
  }
  return searchInstance
}