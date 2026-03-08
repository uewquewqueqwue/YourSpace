import { ipcRenderer } from 'electron'
import type { 
  CreateTodoRequest,
  UpdateTodoRequest,
  CreateFolderRequest,
  CreateTagRequest,
  TodoFolder,
  TodoTag
} from '@/types/todo'
import { ToDoAPI } from '@/types/electron';

export function setupToDoAPI(): ToDoAPI {
  return {
    // Основные
    getAll: (token: string) => ipcRenderer.invoke('todos:getAll', token),
    
    create: (token: string, data: CreateTodoRequest) => 
      ipcRenderer.invoke('todos:create', { token, ...data }),
    
    update: (token: string, id: string, data: UpdateTodoRequest) => 
      ipcRenderer.invoke('todos:update', { token, id, ...data }),
    
    delete: (token: string, id: string) => 
      ipcRenderer.invoke('todos:delete', { token, id }),
    
    reorder: (token: string, items: { id: string; position: number }[]) => 
      ipcRenderer.invoke('todos:reorder', { token, items }),
    
    // Папки
    folders: {
      getAll: (token: string) => ipcRenderer.invoke('todos:folders:getAll', token),
      create: (token: string, data: CreateFolderRequest) => 
        ipcRenderer.invoke('todos:folders:create', { token, ...data }),
      update: (token: string, id: string, data: Partial<TodoFolder>) => 
        ipcRenderer.invoke('todos:folders:update', { token, id, ...data }),
      delete: (token: string, id: string) => 
        ipcRenderer.invoke('todos:folders:delete', { token, id })
    },
    
    // Теги
    tags: {
      getAll: (token: string) => ipcRenderer.invoke('todos:tags:getAll', token),
      create: (token: string, data: CreateTagRequest) => 
        ipcRenderer.invoke('todos:tags:create', { token, ...data }),
      update: (token: string, id: string, data: Partial<TodoTag>) => 
        ipcRenderer.invoke('todos:tags:update', { token, id, ...data }),
      delete: (token: string, id: string) => 
        ipcRenderer.invoke('todos:tags:delete', { token, id })
    }
  }
}