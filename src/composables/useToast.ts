import { ref } from 'vue'
import type { Toast } from '@/types/toast'


const toasts = ref<Toast[]>([])
let nextId = 0

export function useToast() {
  const show = (message: string, type: Toast['type'] = 'success', duration = 3000) => {
    const id = nextId++
    toasts.value.push({ id, message, type, duration })

    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  const success = (msg: string) => show(msg, 'success')
  const error = (msg: string) => show(msg, 'error')
  const info = (msg: string) => show(msg, 'info')

  return {
    toasts,
    show,
    success,
    error,
    info
  }
}