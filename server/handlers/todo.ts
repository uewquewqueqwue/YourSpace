import { ipcMain } from 'electron'
import { prisma } from '../prisma'
import { authenticate } from '../middleware/auth'
import type {
  CreateTodoRequest,
  UpdateTodoRequest,
  CreateFolderRequest,
  CreateTagRequest
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
    try {
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

      const result = await prisma.userTodo.findUnique({
        where: { id: todo.id },
        include: { folder: true, tags: { include: { tag: true } } }
      })

      return result
    } catch (error) {
      throw error
    }
  })

  ipcMain.handle('todos:update', async (event, payload: { token: string; id: string } & UpdateTodoRequest) => {
    try {
      const { token, id, ...data } = payload
      const user = await authenticate(token)

      const updateData: any = {}

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate
      if (data.completed !== undefined) {
        updateData.completed = data.completed
        updateData.completedAt = data.completed ? new Date() : null
      }
      if (data.position !== undefined) updateData.position = data.position

      if (data.folderId !== undefined) {
        if (data.folderId === null) {
          updateData.folder = { disconnect: true }
        } else {
          const folder = await prisma.todoFolder.findFirst({
            where: { id: data.folderId, userId: user.id }
          })
          if (folder) {
            updateData.folder = { connect: { id: data.folderId } }
          }
        }
      }

      await prisma.userTodo.update({
        where: { id, userId: user.id },
        data: updateData
      })

      if (data.tagIds) {
        await prisma.userTodoTag.deleteMany({ where: { todoId: id } })

        if (data.tagIds.length > 0) {
          await prisma.userTodoTag.createMany({
            data: data.tagIds.map(tagId => ({ todoId: id, tagId }))
          })
        }
      }

      const result = await prisma.userTodo.findUnique({
        where: { id },
        include: { folder: true, tags: { include: { tag: true } } }
      })

      return result
    } catch (error) {
      throw error
    }
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

  ipcMain.handle('todos:folders:getAll', async (event, token: string) => {
    const user = await authenticate(token)

    return prisma.todoFolder.findMany({
      where: { userId: user.id },
      orderBy: { position: 'asc' }
    })
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
      data: {
        userId: user.id,
        name: data.name,
        color: data.color,
        position
      }
    })
  })

  ipcMain.handle('todos:folders:update', async (event, payload: { token: string; id: string } & Partial<CreateFolderRequest>) => {
    const { token, id, ...data } = payload
    const user = await authenticate(token)

    return prisma.todoFolder.update({
      where: { id, userId: user.id },
      data
    })
  })

  ipcMain.handle('todos:folders:delete', async (event, { token, id }: { token: string; id: string }) => {
    const user = await authenticate(token)

    await prisma.userTodo.updateMany({
      where: { folderId: id, userId: user.id },
      data: { folderId: null }
    })
    await prisma.todoFolder.delete({ where: { id, userId: user.id } })

    return { success: true }
  })

  ipcMain.handle('todos:tags:getAll', async (event, token: string) => {
    const user = await authenticate(token)

    return prisma.todoTag.findMany({
      where: { userId: user.id },
      orderBy: { position: 'asc' }
    })
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
      data: {
        userId: user.id,
        name: data.name,
        color: data.color,
        position
      }
    })
  })

  ipcMain.handle('todos:tags:update', async (event, payload: { token: string; id: string } & Partial<CreateTagRequest>) => {
    const { token, id, ...data } = payload
    const user = await authenticate(token)

    return prisma.todoTag.update({
      where: { id, userId: user.id },
      data
    })
  })

  ipcMain.handle('todos:tags:delete', async (event, { token, id }: { token: string; id: string }) => {
    const user = await authenticate(token)

    await prisma.userTodoTag.deleteMany({ where: { tagId: id } })
    await prisma.todoTag.delete({ where: { id, userId: user.id } })

    return { success: true }
  })
}