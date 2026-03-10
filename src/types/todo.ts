export interface TodoFolder {
  id: string
  userId: string
  name: string
  color: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface TodoTag {
  id: string
  userId: string
  name: string
  color: string
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
  dueDateTime?: string | null
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

export const PRIORITY_DISPLAY = {
  [ToDoPriority.LOW]: { 
    label: 'Low', 
    color: '#8B5CF6', 
    icon: 'Circle' 
  },
  [ToDoPriority.MEDIUM]: { 
    label: 'Medium', 
    color: '#F59E0B', 
    icon: 'CircleDot' 
  },
  [ToDoPriority.HIGH]: { 
    label: 'High', 
    color: '#EF4444', 
    icon: 'AlertCircle' 
  }
} as const

export interface UserTodoWithDisplay extends UserTodo {
  displayPriority: { 
    label: string
    color: string
    icon: any 
  }
  isOverdue: boolean
  isDueToday: boolean
  folderName: string | null
  tagNames: string[]
}

// Input types (для стора)
export interface CreateTodoInput {
  title: string
  description?: string | null
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | string | null
  dueDateTime?: string | null
  tagIds?: string[]
}


export interface UpdateTodoInput {
  title?: string
  description?: string | null
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | string | null
  dueDateTime?: string | null
  completed?: boolean
  position?: number
  tagIds?: string[]
}

export interface CreateFolderInput {
  name: string
  color?: string
  taskIds?: string[]
}

export interface UpdateFolderInput {
  name?: string
  color?: string
  position?: number
}

export interface CreateTagInput {
  name: string
  color: string
}

export interface UpdateTagInput {
  name?: string
  color?: string
  position?: number
}

// Request types (для API)
export interface CreateTodoRequest {
  title: string
  description?: string | null
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | string | null
  tagIds?: string[]
}

export interface UpdateTodoRequest {
  title?: string
  description?: string | null
  folderId?: string | null
  priority?: ToDoPriority
  dueDate?: Date | string | null
  completed?: boolean
  position?: number
  tagIds?: string[]
}

export interface CreateFolderRequest {
  name: string
  color?: string
  position?: number
}

export interface UpdateFolderRequest {
  name?: string
  color?: string
  position?: number
}

export interface CreateTagRequest {
  name: string
  color: string
  position?: number
}

export interface UpdateTagRequest {
  name?: string
  color?: string
  position?: number
}

// Response types (то что приходит с сервера)
export interface TodoFolderResponse extends Omit<TodoFolder, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
}

export interface TodoTagResponse extends Omit<TodoTag, 'createdAt' | 'updatedAt'> {
  createdAt: string
  updatedAt: string
}

export interface UserTodoResponse extends Omit<UserTodo, 'folder' | 'tags' | 'dueDate' | 'completedAt' | 'createdAt' | 'updatedAt'> {
  folder: TodoFolderResponse | null
  dueDate: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  tags: Array<{
    id: string
    todoId: string
    tagId: string
    tag: TodoTagResponse
    createdAt: string
  }>
}

// Store state
export interface TodoState {
  todos: UserTodoWithDisplay[]
  folders: TodoFolder[]
  tags: TodoTag[]
  loading: boolean
  error: string | null
}