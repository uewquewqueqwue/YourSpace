import { Ref } from 'vue'
import type { UserAppWithDisplay, CreateAppInput } from './apps'
import type { User } from './user'
import type {
  UserTodoWithDisplay,
  TodoFolder,
  TodoTag,
  CreateTodoInput,
  UpdateTodoInput
} from './todo'

export interface AppsStore {

  apps: Readonly<Ref<UserAppWithDisplay[]>>
  quickApps: Readonly<Ref<UserAppWithDisplay[]>>
  loading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>


  fetchApps: () => Promise<void>
  addApp: (input: CreateAppInput) => Promise<UserAppWithDisplay | null>
  removeApp: (id: string) => Promise<boolean>
  launchApp: (path: string) => Promise<boolean>
  forceSync: (token?: string) => Promise<void>


  addToQuick: (id: string) => boolean
  removeFromQuick: (id: string) => void
  isInQuick: (id: string) => boolean


  getAppById: (id: string) => UserAppWithDisplay | undefined
  getActiveApps: () => UserAppWithDisplay[]
  getTotalTimeToday: () => number


  reset: () => void
  logout: () => void
  saveToStorage: () => void
  startPeriodicSync: () => void
  stopPeriodicSync: () => void
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
  updateProfile: (token: string, updates: { name?: string; avatar?: string }) => Promise<User>
  openLogin: () => void
  closeLogin: () => void
}

export interface TodoStore {

  todos: Readonly<Ref<UserTodoWithDisplay[]>>
  folders: Readonly<Ref<TodoFolder[]>>
  tags: Readonly<Ref<TodoTag[]>>
  loading: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>


  fetchTodos: () => Promise<void>
  addTodo: (input: CreateTodoInput) => Promise<UserTodoWithDisplay | null>
  updateTodo: (id: string, updates: UpdateTodoInput) => Promise<UserTodoWithDisplay | null>
  deleteTodo: (id: string) => Promise<boolean>


  createTag: (data: { name: string; color: string }) => Promise<TodoTag>
  deleteTag: (id: string) => Promise<boolean>
  updateTag: (id: string, updates: { name?: string; color?: string }) => Promise<TodoTag | null>
  getTagById: (id: string) => TodoTag | undefined


  createFolder: (data: { name: string; color?: string }) => Promise<TodoFolder>
  deleteFolder: (id: string) => Promise<boolean>
  updateFolder: (id: string, updates: { name?: string; color?: string }) => Promise<TodoFolder | null>
  getFolderById: (id: string) => TodoFolder | undefined


  getActiveTodos: () => UserTodoWithDisplay[]
  getCompletedTodos: () => UserTodoWithDisplay[]
  getTodosByTag: (tagId: string) => UserTodoWithDisplay[]
  getTodosByFolder: (folderId: string) => UserTodoWithDisplay[]


  reset: () => void
  logout: () => void
  saveToStorage: () => void
  forceSync: (token?: string) => Promise<void>


  startPeriodicSync: () => void
  stopPeriodicSync: () => void
}