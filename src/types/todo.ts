export interface TodoFolder {
  id: string
  userId: string
  name: string
  icon: string | null
  color: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface TodoTag {
  id: string
  userId: string
  name: string
  color: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface UserTodo {
  id: string
  userId: string
  folderId: string | null
  folder: TodoFolder | null
  title: string
  description: string | null
  priority: ToDoPriority
  dueDate: Date | null
  completed: boolean
  completedAt: Date | null
  position: number
  createdAt: Date
  updatedAt: Date
  tags: UserTodoTag[]
}

export interface UserTodoTag {
  id: string
  todoId: string
  tagId: string
  tag: TodoTag
  createdAt: Date
}

export enum ToDoPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface UserTodoWithDisplay extends UserTodo {
  displayPriority: { label: string; color: string; icon: any }
  isOverdue: boolean
  isDueToday: boolean
  folderName: string | null
  tagNames: string[]
}

// Input types (для стора)
export interface CreateTodoInput {
  title: string
  description?: string
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | null
  tagIds?: string[]
}

export interface UpdateTodoInput {
  title?: string
  description?: string
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | null
  completed?: boolean
  position?: number
  tagIds?: string[]
}

// Request types (для API)
export interface CreateTodoRequest {
  title: string
  description?: string
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | null
  tagIds?: string[]
}

export interface UpdateTodoRequest {
  title?: string
  description?: string
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | null
  completed?: boolean
  position?: number
}

export interface CreateFolderRequest {
  name: string
  icon?: string
  color?: string
  position?: number
}

export interface CreateTagRequest {
  name: string
  color?: string
  position?: number
}