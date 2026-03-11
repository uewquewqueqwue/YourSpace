import { ref } from 'vue'
import type {
  UserTodoWithDisplay,
  TodoFolder,
  TodoTag,
  CreateTodoInput,
  UpdateTodoInput,
  UserTodo,
  UserTodoTag,
  TodoFolderResponse,
  TodoTagResponse,
  UserTodoResponse
} from '@/types/todo'
import { ToDoPriority, PRIORITY_DISPLAY } from '@/types/todo'
import { TodoStore } from '@/types/store'
import { mainLog } from '@/log/logger'
import Logger from 'electron-log'

const todos = ref<UserTodoWithDisplay[]>([])
const folders = ref<TodoFolder[]>([])
const tags = ref<TodoTag[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const pendingChanges = ref(false) 

const STORAGE_KEY = 'todos_data'
const FOLDERS_KEY = 'todos_folders'
const TAGS_KEY = 'todos_tags'
const BRAND_COLOR = '#8B5CF6'

let syncInterval: NodeJS.Timeout | null = null 

const getToken = (): string | null => localStorage.getItem('token')
const isAuthenticated = (): boolean => !!getToken() && !!localStorage.getItem('user')

const loadFromStorage = () => {
  try {
    const savedTodos = localStorage.getItem(STORAGE_KEY)
    if (savedTodos) {
      todos.value = JSON.parse(savedTodos, (key, value) => {
        if (['dueDate', 'completedAt', 'createdAt', 'updatedAt'].includes(key)) {
          return value ? new Date(value) : null
        }
        return value
      })
    }

    const savedFolders = localStorage.getItem(FOLDERS_KEY)
    if (savedFolders) {
      folders.value = JSON.parse(savedFolders, (key, value) => {
        if (['createdAt', 'updatedAt'].includes(key)) return value ? new Date(value) : null
        return value
      })
    }

    const savedTags = localStorage.getItem(TAGS_KEY)
    if (savedTags) {
      tags.value = JSON.parse(savedTags, (key, value) => {
        if (['createdAt', 'updatedAt'].includes(key)) return value ? new Date(value) : null
        return value
      })
    }
  } catch {}
}

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders.value))
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags.value))
    
    
    if (isAuthenticated()) {
      pendingChanges.value = true
    }
  } catch {}
}

const getPriorityDisplay = (priority: ToDoPriority) => PRIORITY_DISPLAY[priority]

const computeTodoDisplay = (todo: UserTodo): UserTodoWithDisplay => {
  const now = new Date()
  const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

  return {
    ...todo,
    displayPriority: getPriorityDisplay(todo.priority),
    isOverdue: !!dueDate && !todo.completed && dueDate < now,
    isDueToday: !!dueDate && !todo.completed && dueDate.toDateString() === now.toDateString(),
    folderName: todo.folder?.name || null,
    tagNames: todo.tags?.map(t => t.tag.name) || []
  }
}

const convertFolderResponse = (folder: TodoFolderResponse): TodoFolder => ({
  ...folder,
  createdAt: new Date(folder.createdAt),
  updatedAt: new Date(folder.updatedAt)
})

const convertTagResponse = (tag: TodoTagResponse): TodoTag => ({
  ...tag,
  createdAt: new Date(tag.createdAt),
  updatedAt: new Date(tag.updatedAt)
})

const convertTodoResponse = (todo: UserTodoResponse): UserTodo => ({
  ...todo,
  dueDate: todo.dueDate ? new Date(todo.dueDate) : null,
  completedAt: todo.completedAt ? new Date(todo.completedAt) : null,
  createdAt: new Date(todo.createdAt),
  updatedAt: new Date(todo.updatedAt),
  folder: todo.folder ? convertFolderResponse(todo.folder) : null,
  tags: todo.tags.map(t => ({
    ...t,
    createdAt: new Date(t.createdAt),
    tag: convertTagResponse(t.tag)
  }))
})

const getTagsFromIds = (tagIds: string[], todoId?: string): UserTodoTag[] => {
  return tagIds
    .map(id => tags.value.find(t => t.id === id))
    .filter((t): t is TodoTag => t !== null)
    .map(tag => ({
      id: 'temp-' + crypto.randomUUID(),
      todoId: todoId || 'temp',
      tagId: tag.id,
      tag,
      createdAt: new Date()
    }))
}

const syncFromServer = async (token: string) => {
  try {
    const [serverTodos, serverFolders, serverTags] = await Promise.all([
      window.electronAPI.todos.getAll(token),
      window.electronAPI.todos.folders.getAll(token),
      window.electronAPI.todos.tags.getAll(token)
    ])

    folders.value = serverFolders.map(convertFolderResponse)

    const localTags = tags.value.filter(t => t.id.startsWith('local-'))
    tags.value = [...serverTags.map(convertTagResponse), ...localTags]

    const localTodos = todos.value.filter(t => t.userId === 'local')
    const serverDisplayTodos = serverTodos.map(t => computeTodoDisplay(convertTodoResponse(t)))
    todos.value = [...serverDisplayTodos, ...localTodos]

    saveToStorage()
    pendingChanges.value = false 
  } catch {}
}


const syncToServer = async (token: string) => {
  if (!token || !isAuthenticated()) return
  
  try {
    
    for (const folder of folders.value) {
      if (!folder.id.startsWith('local-')) {
        
        await window.electronAPI.todos.folders.update(token, folder.id, {
          name: folder.name,
          color: folder.color || undefined
        })
      } else {
        
        const serverFolder = await window.electronAPI.todos.folders.create(token, {
          name: folder.name,
          color: folder.color || undefined
        })
        folder.id = serverFolder.id
      }
    }

    
    for (const tag of tags.value) {
      if (!tag.id.startsWith('local-')) {
        await window.electronAPI.todos.tags.update(token, tag.id, {
          name: tag.name,
          color: tag.color
        })
      } else {
        const serverTag = await window.electronAPI.todos.tags.create(token, {
          name: tag.name,
          color: tag.color
        })
        tag.id = serverTag.id
      }
    }

    
    for (const todo of todos.value) {
      if (!todo.id.startsWith('local-')) {
        const updates: UpdateTodoInput = {
          title: todo.title,
          description: todo.description,
          folderId: todo.folderId,
          priority: todo.priority,
          dueDate: todo.dueDate,
          completed: todo.completed,
          tagIds: todo.tags?.map(t => t.tag.id)
        }
        await window.electronAPI.todos.update(token, todo.id, updates)
      } else {
        const serverTodo = await window.electronAPI.todos.create(token, {
          title: todo.title,
          description: todo.description || undefined,
          folderId: todo.folderId,
          priority: todo.priority,
          dueDate: todo.dueDate,
          tagIds: todo.tags?.map(t => t.tag.id)
        })
        todo.id = serverTodo.id
      }
    }

    saveToStorage()
    pendingChanges.value = false
  } catch (err) {
    console.error('Sync to server failed:', err)
  }
}


const startPeriodicSync = () => {
  if (syncInterval) return
  
  syncInterval = setInterval(async () => {
    const token = getToken()
    if (token && isAuthenticated() && pendingChanges.value) {
      await syncToServer(token)
    }
  }, 300000) 
}


const stopPeriodicSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

export async function initializeTodoStore() {
  loadFromStorage()
  
  const token = getToken()
  if (token && isAuthenticated()) {
    await syncFromServer(token)
    startPeriodicSync() 
  }
}

const forceSync = async (token?: string) => {
  const t = token || getToken()
  if (t && isAuthenticated()) {
    await syncToServer(t)
  }
}

const fetchTodos = async () => {
  const token = getToken()
  if (token && isAuthenticated()) {
    loading.value = true
    error.value = null
    try {
      await syncFromServer(token)
    } catch {
      error.value = 'Failed to fetch todos'
    } finally {
      loading.value = false
    }
  }
}

const addTodo = async (input: CreateTodoInput): Promise<UserTodoWithDisplay | null> => {
  const token = getToken()
  const isAuth = token && isAuthenticated()

  const selectedTags = input.tagIds?.map(tagId => {
    const tag = tags.value.find(t => t.id === tagId)
    return tag ? { tag } : null
  }).filter(Boolean) || []

  const newTodo: UserTodo = {
    id: 'local-' + crypto.randomUUID(),
    userId: isAuth ? 'pending' : 'local',
    folderId: input.folderId || null,
    folder: folders.value.find(f => f.id === input.folderId) || null,
    title: input.title,
    description: input.description || null,
    priority: input.priority || ToDoPriority.MEDIUM,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    completed: false,
    completedAt: null,
    position: todos.value.length,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: selectedTags as UserTodoTag[]
  }

  const displayTodo = computeTodoDisplay(newTodo)
  todos.value.push(displayTodo)
  saveToStorage()

  if (isAuth) {
    try {
      let finalTagIds = input.tagIds ? [...input.tagIds] : []

      if (finalTagIds.length > 0) {
        finalTagIds = await Promise.all(
          finalTagIds.map(async (tagId) => {
            if (!tagId.startsWith('local-')) return tagId

            const localTag = tags.value.find(t => t.id === tagId)
            if (!localTag) return tagId

            const serverTag = await window.electronAPI.todos.tags.create(token!, {
              name: localTag.name,
              color: localTag.color
            })

            const index = tags.value.findIndex(t => t.id === tagId)
            if (index !== -1) {
              tags.value[index] = convertTagResponse(serverTag)
              saveToStorage()
            }

            return serverTag.id
          })
        )
      }

      const serverTodo = await window.electronAPI.todos.create(token!, {
        title: input.title,
        description: input.description,
        folderId: input.folderId,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        tagIds: finalTagIds
      })

      const index = todos.value.findIndex(t => t.id === newTodo.id)
      if (index !== -1) {
        todos.value[index] = computeTodoDisplay(convertTodoResponse(serverTodo))
        saveToStorage()
      }
    } catch {}
  }

  return displayTodo
}

const updateTodo = async (id: string, updates: UpdateTodoInput) => {
  const todo = todos.value.find(t => t.id === id)
  if (!todo) return null

  Object.assign(todo, updates)
  if (updates.completed !== undefined) {
    todo.completedAt = updates.completed ? new Date() : null
  }

  if (updates.tagIds) {
    todo.tags = getTagsFromIds(updates.tagIds, todo.id)
  }

  if (updates.dueDate !== undefined) {
    todo.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
  }

  const updated = computeTodoDisplay(todo)
  Object.assign(todo, updated)
  saveToStorage()

  const token = getToken()
  if (token && isAuthenticated() && !id.startsWith('local-')) {
    try {
      await window.electronAPI.todos.update(token, id, updates)
    } catch {}
  }

  return todo
}

const deleteTodo = async (id: string): Promise<boolean> => {
  const index = todos.value.findIndex(t => t.id === id)
  if (index === -1) return false

  todos.value.splice(index, 1)
  saveToStorage()

  const token = getToken()
  if (token && isAuthenticated() && !id.startsWith('local-')) {
    try {
      await window.electronAPI.todos.delete(token, id)
    } catch {}
  }

  return true
}

const createTag = async (data: { name: string; color: string }) => {
  const token = getToken()
  const isAuth = token && isAuthenticated()

  const tempId = 'local-' + crypto.randomUUID()

  const newTag: TodoTag = {
    id: tempId,
    userId: isAuth ? 'pending' : 'local',
    name: data.name,
    color: data.color,
    position: tags.value.length,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  tags.value.push(newTag)
  saveToStorage()

  if (isAuth) {
    try {
      const serverTag = await window.electronAPI.todos.tags.create(token!, {
        name: data.name,
        color: data.color
      })

      const index = tags.value.findIndex(t => t.id === tempId)
      if (index !== -1) {
        tags.value[index] = convertTagResponse(serverTag)
        saveToStorage()
      }
    } catch {}
  }

  return newTag
}

const deleteTag = async (id: string) => {
  const index = tags.value.findIndex(t => t.id === id)
  if (index === -1) return false

  todos.value.forEach(todo => {
    if (todo.tags) {
      todo.tags = todo.tags.filter(t => t.tag.id !== id)
    }
  })

  tags.value.splice(index, 1)
  saveToStorage()

  const token = getToken()
  if (token && isAuthenticated() && !id.startsWith('local-')) {
    try {
      await window.electronAPI.todos.tags.delete(token, id)
    } catch {}
  }

  return true
}

const updateTag = async (id: string, updates: { name?: string; color?: string }) => {
  const tag = tags.value.find(t => t.id === id)
  if (!tag) return null

  Object.assign(tag, updates)
  saveToStorage()

  const token = getToken()
  if (token && isAuthenticated() && !id.startsWith('local-')) {
    try {
      await window.electronAPI.todos.tags.update(token, id, updates)
    } catch {}
  }

  return tag
}

const getTagById = (id: string) => tags.value.find(t => t.id === id)

const getFolderById = (id: string) => folders.value.find(f => f.id === id)

const getActiveTodos = () => todos.value.filter(t => !t.completed)

const getCompletedTodos = () => todos.value.filter(t => t.completed)

const getTodosByTag = (tagId: string) => 
  todos.value.filter(t => t.tags?.some(tag => tag.tag.id === tagId))

const updateFolder = async (id: string, updates: { name?: string; color?: string }) => {
  const folder = folders.value.find(f => f.id === id)
  if (!folder) return null

  Object.assign(folder, updates)
  saveToStorage()

  const token = getToken()
  if (token && isAuthenticated() && !id.startsWith('local-')) {
    try {
      await window.electronAPI.todos.folders.update(token, id, updates)
    } catch {}
  }

  return folder
}

const createFolder = async (data: { name: string; color?: string }) => {
  const token = getToken()
  const isAuth = token && isAuthenticated()

  const tempId = 'local-' + crypto.randomUUID()

  const newFolder: TodoFolder = {
    id: tempId,
    userId: isAuth ? 'pending' : 'local',
    name: data.name,
    color: data.color || BRAND_COLOR,
    position: folders.value.length,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  folders.value.push(newFolder)
  saveToStorage()

  if (isAuth) {
    try {
      const serverFolder = await window.electronAPI.todos.folders.create(token!, {
        name: data.name,
        color: data.color
      })

      const index = folders.value.findIndex(f => f.id === tempId)
      if (index !== -1) {
        folders.value[index] = convertFolderResponse(serverFolder)
        saveToStorage()
      }

      return folders.value[index]
    } catch {
      return newFolder
    }
  }

  return newFolder
}

const deleteFolder = async (id: string) => {
  const index = folders.value.findIndex(f => f.id === id)
  if (index === -1) return false

  todos.value.forEach(todo => {
    if (todo.folderId === id) {
      todo.folderId = null
      todo.folder = null
    }
  })

  folders.value.splice(index, 1)
  saveToStorage()

  const token = getToken()
  if (token && isAuthenticated() && !id.startsWith('local-')) {
    try {
      await window.electronAPI.todos.folders.delete(token, id)
    } catch {}
  }

  return true
}

const getTodosByFolder = (folderId: string) => 
  todos.value.filter(t => t.folderId === folderId)

const reset = () => {
  todos.value = []
  folders.value = []
  tags.value = []
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(FOLDERS_KEY)
  localStorage.removeItem(TAGS_KEY)
}

const logout = () => {
  pendingChanges.value = false
  stopPeriodicSync() 
}

const storeMethods = {
    todos,
    folders,
    tags,
    loading,
    error,
    fetchTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    createTag,
    deleteTag,
    updateTag,
    getTagById,
    getFolderById,
    getActiveTodos,
    getCompletedTodos,
    getTodosByTag,
    getTodosByFolder,
    createFolder,
    deleteFolder,
    updateFolder,
    reset,
    logout,
    saveToStorage,
    forceSync,
    startPeriodicSync, 
    stopPeriodicSync
}

export function useTodoStore(): TodoStore {
  return storeMethods
}

export const todoStore = storeMethods