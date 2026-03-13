import { createPinia } from 'pinia'

export const pinia = createPinia()

export { useAuthStore } from './auth.pinia'
export { useAppsStore } from './apps.pinia'
export { useTodoStore } from './todo.pinia'
export { useEmailStore } from './email.pinia'
