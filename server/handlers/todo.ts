import { ipcMain } from 'electron'
import { prisma } from '../prisma'
import { authenticate } from '../middleware/auth'
import type { 
  CreateTodoRequest,
  UpdateTodoRequest,
  CreateFolderRequest,
  CreateTagRequest,
  TodoFolder,
  TodoTag
} from '@/types/todo'

export function setupTodoHandlers() {
  ipcMain.handle('todos:getAll', async (event, token: string) => {
    const user = await authenticate(token)
    return prisma.userTodo.findMany({
      where: { userId: user.id },
      include: { folder: true, tags: { include: { tag: true } } },
      orderBy: [{ completed: 'asc' }, { position: 'asc' }]
    })
  })

  ipcMain.handle('todos:create', async (event, payload: { token: string } & CreateTodoRequest) => {
    const { token, ...data } = payload
    const user = await authenticate(token)

    const lastTodo = await prisma.userTodo.findFirst({
      where: { userId: user.id },
      orderBy: { position: 'desc' }
    })

    const position = (lastTodo?.position ?? -1) + 1

    const todo = await prisma.userTodo.create({
      data: {
        userId: user.id,
        folderId: data.folderId,
        title: data.title,
        description: data.description,
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate,
        position
      }
    })

    if (data.tagIds?.length) {
      await prisma.userTodoTag.createMany({
        data: data.tagIds.map(tagId => ({ todoId: todo.id, tagId }))
      })
    }

    return prisma.userTodo.findUnique({
      where: { id: todo.id },
      include: { folder: true, tags: { include: { tag: true } } }
    })
  })

  ipcMain.handle('todos:update', async (event, payload: { token: string; id: string } & UpdateTodoRequest) => {
    const { token, id, ...data } = payload
    const user = await authenticate(token)

    const updateData: any = { ...data }
    if (data.completed !== undefined) {
      updateData.completedAt = data.completed ? new Date() : null
    }

    return prisma.userTodo.update({
      where: { id, userId: user.id },
      data: updateData,
      include: { folder: true, tags: { include: { tag: true } } }
    })
  })

  ipcMain.handle('todos:delete', async (event, { token, id }: { token: string; id: string }) => {
    const user = await authenticate(token)
    await prisma.userTodo.delete({ where: { id, userId: user.id } })
    return { success: true }
  })

  ipcMain.handle('todos:reorder', async (event, { token, items }: { token: string; items: { id: string; position: number }[] }) => {
    const user = await authenticate(token)
    return prisma.$transaction(
      items.map(({ id, position }) =>
        prisma.userTodo.update({ where: { id, userId: user.id }, data: { position } })
      )
    )
  })

  // ===== FOLDERS =====
  ipcMain.handle('todos:folders:getAll', async (event, token: string) => {
    const user = await authenticate(token)
    return prisma.todoFolder.findMany({ where: { userId: user.id }, orderBy: { position: 'asc' } })
  })

  ipcMain.handle('todos:folders:create', async (event, payload: { token: string } & CreateFolderRequest) => {
    const { token, ...data } = payload
    const user = await authenticate(token)

    const lastFolder = await prisma.todoFolder.findFirst({
      where: { userId: user.id },
      orderBy: { position: 'desc' }
    })

    const position = (lastFolder?.position ?? -1) + 1

    return prisma.todoFolder.create({
      data: { userId: user.id, name: data.name, icon: data.icon, color: data.color, position }
    })
  })

  ipcMain.handle('todos:folders:update', async (event, payload: { token: string; id: string } & Partial<TodoFolder>) => {
    const { token, id, ...data } = payload
    const user = await authenticate(token)
    return prisma.todoFolder.update({ where: { id, userId: user.id }, data })
  })

  ipcMain.handle('todos:folders:delete', async (event, { token, id }: { token: string; id: string }) => {
    const user = await authenticate(token)
    await prisma.userTodo.updateMany({ where: { folderId: id, userId: user.id }, data: { folderId: null } })
    await prisma.todoFolder.delete({ where: { id, userId: user.id } })
    return { success: true }
  })

  // ===== TAGS =====
  ipcMain.handle('todos:tags:getAll', async (event, token: string) => {
    const user = await authenticate(token)
    return prisma.todoTag.findMany({ where: { userId: user.id }, orderBy: { position: 'asc' } })
  })

  ipcMain.handle('todos:tags:create', async (event, payload: { token: string } & CreateTagRequest) => {
    const { token, ...data } = payload
    const user = await authenticate(token)

    const lastTag = await prisma.todoTag.findFirst({
      where: { userId: user.id },
      orderBy: { position: 'desc' }
    })

    const position = (lastTag?.position ?? -1) + 1

    return prisma.todoTag.create({
      data: { userId: user.id, name: data.name, color: data.color, position }
    })
  })

  ipcMain.handle('todos:tags:update', async (event, payload: { token: string; id: string } & Partial<TodoTag>) => {
    const { token, id, ...data } = payload
    const user = await authenticate(token)
    return prisma.todoTag.update({ where: { id, userId: user.id }, data })
  })

  ipcMain.handle('todos:tags:delete', async (event, { token, id }: { token: string; id: string }) => {
    const user = await authenticate(token)
    await prisma.userTodoTag.deleteMany({ where: { tagId: id } })
    await prisma.todoTag.delete({ where: { id, userId: user.id } })
    return { success: true }
  })
}