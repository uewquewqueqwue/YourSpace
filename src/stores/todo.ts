import { ref } from 'vue'
import type {
  UserTodoWithDisplay,
  TodoFolder,
  TodoTag,
  CreateTodoInput,
  UpdateTodoInput,
  UserTodo
} from '@/types/todo'
import { ToDoPriority } from '@/types/todo'

const todos = ref<UserTodoWithDisplay[]>([])
const folders = ref<TodoFolder[]>([])
const tags = ref<TodoTag[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const STORAGE_KEY = 'todos_data'
const FOLDERS_KEY = 'todos_folders'
const TAGS_KEY = 'todos_tags'

const getToken = (): string | null => localStorage.getItem('token')
const isAuthenticated = (): boolean => !!getToken() && !!localStorage.getItem('user')

// ===== LOCAL STORAGE =====
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
    if (savedFolders) folders.value = JSON.parse(savedFolders)

    const savedTags = localStorage.getItem(TAGS_KEY)
    if (savedTags) tags.value = JSON.parse(savedTags)
  } catch (e) {
    console.error('Failed to load todos:', e)
  }
}

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders.value))
    localStorage.setItem(TAGS_KEY, JSON.stringify(tags.value))
  } catch (e) {
    console.error('Failed to save todos:', e)
  }
}

// ===== HELPERS =====
const getPriorityDisplay = (priority: ToDoPriority) => {
  const map = {
    [ToDoPriority.LOW]: { label: 'Low', color: '#8B5CF6', icon: 'Circle' },
    [ToDoPriority.MEDIUM]: { label: 'Medium', color: '#F59E0B', icon: 'CircleDot' },
    [ToDoPriority.HIGH]: { label: 'High', color: '#EF4444', icon: 'AlertCircle' }
  }
  return map[priority]
}

const computeTodoDisplay = (todo: UserTodo): UserTodoWithDisplay => {
  const now = new Date()
  const dueDate = todo.dueDate ? new Date(todo.dueDate) : null

  return {
    ...todo,
    displayPriority: getPriorityDisplay(todo.priority),
    isOverdue: !!dueDate && !todo.completed && dueDate < now,
    isDueToday: !!dueDate && !todo.completed &&
      dueDate.toDateString() === now.toDateString(),
    folderName: todo.folder?.name || null,
    tagNames: todo.tags?.map(t => t.tag.name) || []
  }
}

// ===== SERVER SYNC =====
const syncFromServer = async (token: string) => {
  try {
    const [serverTodos, serverFolders, serverTags] = await Promise.all([
      window.electronAPI.todos.getAll(token),
      window.electronAPI.todos.folders.getAll(token),
      window.electronAPI.todos.tags.getAll(token)
    ])

    folders.value = serverFolders
    tags.value = serverTags
    todos.value = serverTodos.map(computeTodoDisplay)
    saveToStorage()
  } catch (err) {
    console.error('Failed to sync todos:', err)
  }
}

// ===== INIT =====
export async function initializeTodoStore() {
  loadFromStorage()

  const token = getToken()
  if (token && isAuthenticated()) {
    await syncFromServer(token)
  }
}

// ===== STORE METHODS =====
export function useTodoStore() {
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

    const newTodo: any = {
      id: 'local-' + crypto.randomUUID(),
      userId: isAuth ? 'pending' : 'local',
      folderId: input.folderId || null,
      folder: folders.value.find(f => f.id === input.folderId) || null,
      title: input.title,
      description: input.description || null,
      priority: input.priority || ToDoPriority.MEDIUM,
      dueDate: input.dueDate || null,
      completed: false,
      completedAt: null,
      position: todos.value.length,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: selectedTags
    }

    const displayTodo = computeTodoDisplay(newTodo)
    todos.value.push(displayTodo)
    saveToStorage()

    if (isAuth) {
      try {
        const serverTodo = await window.electronAPI.todos.create(token, {
          title: input.title,
          description: input.description,
          folderId: input.folderId,
          priority: input.priority,
          dueDate: input.dueDate,
          tagIds: input.tagIds
        })

        Object.assign(newTodo, serverTodo)
        const updatedDisplay = computeTodoDisplay(newTodo)
        Object.assign(displayTodo, updatedDisplay)
        saveToStorage()
      } catch (err) {
        console.error('Failed to sync todo:', err)
      }
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
      const selectedTags = updates.tagIds.map(tagId => {
        const tag = tags.value.find(t => t.id === tagId)
        return tag ? { tag } : null
      }).filter(Boolean)
      todo.tags = selectedTags
    }

    const updated = computeTodoDisplay(todo)
    Object.assign(todo, updated)
    saveToStorage()

    const token = getToken()
    if (token && isAuthenticated() && !id.startsWith('local-')) {
      try {
        await window.electronAPI.todos.update(token, id, updates)
      } catch (err) {
        console.error('Failed to sync update:', err)
      }
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
      } catch (err) {
        console.error('Failed to delete from server:', err)
      }
    }

    return true
  }

  const createTag = async (data: { name: string; color: string }) => {
    const token = getToken()
    const isAuth = token && isAuthenticated()

    const tempId = 'local-' + crypto.randomUUID()

    const newTag = {
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
        const serverTag = await window.electronAPI.todos.tags.create(token, {
          name: data.name,
          color: data.color
        })

        const index = tags.value.findIndex(t => t.id === tempId)
        if (index !== -1) {
          tags.value[index] = serverTag
          saveToStorage()
        }
      } catch (err) {
        console.error('Failed to sync tag:', err)
      }
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
      } catch (err) {
        console.error('Failed to delete tag from server:', err)
      }
    }

    return true
  }

  const getTagById = (id: string) => {
    return tags.value.find(t => t.id === id)
  }

  const getFolderById = (id: string) => {
    return folders.value.find(f => f.id === id)
  }

  const getActiveTodos = () => {
    return todos.value.filter(t => !t.completed)
  }

  const getCompletedTodos = () => {
    return todos.value.filter(t => t.completed)
  }

  const getTodosByTag = (tagId: string) => {
    return todos.value.filter(t =>
      t.tags?.some(tag => tag.tag.id === tagId)
    )
  }

  const getTodosByFolder = (folderId: string) => {
    return todos.value.filter(t => t.folderId === folderId)
  }

  const reset = () => {
    todos.value = []
    folders.value = []
    tags.value = []
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(FOLDERS_KEY)
    localStorage.removeItem(TAGS_KEY)
  }

  const logout = () => {
    // Очищаем только серверные данные, локальные оставляем
    // TODO: implement if needed
  }

  return {
    // Состояние
    todos,
    folders,
    tags,
    loading,
    error,

    // CRUD задачи
    fetchTodos,
    addTodo,
    updateTodo,
    deleteTodo,

    // CRUD теги
    createTag,
    deleteTag,

    // Геттеры
    getTagById,
    getFolderById,
    getActiveTodos,
    getCompletedTodos,
    getTodosByTag,
    getTodosByFolder,

    // Управление
    reset,
    logout,
    saveToStorage
  }
}