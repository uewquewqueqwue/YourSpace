import { Ref } from 'vue'

export interface User {
  id: string
  email: string
  name: string
  avatar: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthStore {
  user: Ref<User | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  showLoginModal: Ref<boolean>
  
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  openLogin: () => void
  closeLogin: () => void
}