import { ref } from 'vue'
import { useToast } from './useToast'

export function useConfirmDelete<T extends { id: string; name?: string }>(
  deleteFn: (id: string) => Promise<boolean>
) {
  const toast = useToast()
  const showConfirm = ref(false)
  const itemToDelete = ref<T | null>(null)
  const deleteTitle = ref('Delete')
  const deleteMessage = ref('Are you sure?')

  const confirmDelete = (item: T, customMessage?: string) => {
    itemToDelete.value = item
    deleteTitle.value = `Delete ${item.name || 'item'}?`
    deleteMessage.value = customMessage || `Are you sure you want to delete ${item.name || 'this item'}?`
    showConfirm.value = true
  }

  const handleDeleteConfirm = async () => {
    if (itemToDelete.value) {
      const success = await deleteFn(itemToDelete.value.id)
      if (success) {
        toast.success('Deleted successfully')
      } else {
        toast.error('Failed to delete')
      }
      itemToDelete.value = null
    }
    showConfirm.value = false
  }

  return {
    showConfirm,
    confirmDelete,
    handleDeleteConfirm,
    deleteTitle,
    deleteMessage
  }
}