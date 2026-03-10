<template>
  <div class="todo-view">
    <div class="todo-header">
      <!-- <div class="header-actions"> -->

      <div class="filter-buttons">
        <button class="filter-btn" :class="{ active: showCompleted === null }" @click="showCompleted = null">
          All <span class="count">{{ totalTasksCount }}</span>
        </button>
        <button class="filter-btn" :class="{ active: showCompleted === false }" @click="showCompleted = false">
          Active <span class="count">{{ activeCount }}</span>
        </button>
        <button class="filter-btn" :class="{ active: showCompleted === true }" @click="showCompleted = true">
          Completed <span class="count">{{ completedCount }}</span>
        </button>
      </div>

      <div class="create-buttons">
        <button class="new-task-btn" @click="openTaskModal()">
          <Plus :size="16" />
          New Task
        </button>
        <button class="new-folder-btn" @click="openFolderModal()">
          <FolderPlus :size="16" />
          New Folder
        </button>
        <button class="new-tag-btn" @click="openTagModal()">
          <Tag :size="16" />
          New Tag
        </button>
        <!-- </div> -->
      </div>
    </div>

    <div class="todo-content">
      <div class="folders-sidebar">
        <div class="folders-list">
          <div class="folder-item" :class="{ active: selectedFolder === null }" @click="selectedFolder = null">
            <Folder :size="16" :color="BRAND_COLOR" />
            <span>All Tasks</span>
            <span class="count">{{ totalTasksCount }}</span>
          </div>

          <div v-for="folder in folders" :key="folder.id" class="folder-item"
            :class="{ active: selectedFolder === folder.id }" :style="{
              '--folder-color': selectedFolder === folder.id ? (folder.color || BRAND_COLOR) : 'inherit',
              '--folder-bg': selectedFolder === folder.id ? (folder.color + '20' || BRAND_COLOR + '20') : 'transparent'
            }" @click="selectedFolder = folder.id">
            <Folder :size="16" :color="folder.color || BRAND_COLOR" />
            <span>{{ folder.name }}</span>
            <span class="count">{{ getFolderTaskCount(folder.id) }}</span>
            <button class="folder-actions" @click.stop="openFolderModal(folder)">
              <MoreVertical :size="14" />
            </button>
          </div>

          <div v-if="!folders?.length" class="folder-item disabled">
            <span>No folders yet</span>
          </div>
        </div>
      </div>

      <div class="tasks-area">
        <div v-if="isLoading" class="loading-state">
          <div class="spinner" />
          <p>Loading tasks...</p>
        </div>

        <div v-else-if="filteredTodos.length === 0" class="empty-state">
          <Folder :size="48" :color="BRAND_COLOR + '40'" />
          <p>No tasks in this folder</p>
          <button class="create-task-btn" @click="openTaskModal()">
            <Plus :size="14" />
            Create your first task
          </button>
        </div>

        <div v-else class="tasks-list" :key="forceUpdate">
          <div v-for="todo in filteredTodos" :key="todo.id" class="task-item" :class="{ completed: todo.completed }">
            <div class="task-checkbox" @click="toggleTodo(todo)">
              <div class="checkbox" :class="{ checked: todo.completed }">
                <Check v-if="todo.completed" :size="12" />
              </div>
            </div>

            <div class="task-content" @click="openTaskModal(todo)">
              <div class="task-title">{{ todo.title }}</div>
              <div v-if="todo.description" class="task-description">{{ todo.description }}</div>

              <div class="task-meta">
                <div v-if="todo.folder" class="meta-item">
                  <Folder :size="12" :color="todo.folder.color || BRAND_COLOR" />
                  <span>{{ todo.folder.name }}</span>
                </div>

                <div v-if="todo.dueDate" class="meta-item" :class="{ overdue: todo.isOverdue }">
                  <Calendar :size="12" />
                  <span>{{ formatDate(todo.dueDate) }}</span>
                </div>

                <div class="meta-item">
                  <div class="priority-dot" :style="{ background: todo.displayPriority?.color }" />
                  <span>{{ todo.displayPriority?.label }}</span>
                </div>

                <div v-if="todo.tags?.length" class="meta-item tags">
                  <Tag :size="12" />
                  <div class="tag-pills">
                    <span v-for="tag in todo.tags.slice(0, 3)" :key="tag.tag.id" class="tag-pill"
                      :style="{ background: tag.tag.color + '20', color: tag.tag.color }">
                      {{ tag.tag.name }}
                    </span>
                    <span v-if="todo.tags.length > 3" class="tag-more">
                      +{{ todo.tags.length - 3 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="task-actions">
              <button class="action-btn" @click="openTaskModal(todo)">
                <Edit :size="14" />
              </button>
              <button class="action-btn delete" @click="confirmDeleteTodo(todo)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <TaskModal v-model="showTaskModal" :todo="editingTask" :folders="folders" :tags="tags" @save="handleSaveTask"
      @create-tag="openTagModal" @create-folder="openFolderModal" />

    <FolderModal v-model="showFolderModal" :folder="editingFolder" :todos="todos" @save="handleSaveFolder"
      @delete="handleDeleteFolder" />

    <TagModal v-model="showTagModal" :tag="editingTag" @save="handleSaveTag" @delete="handleDeleteTag" />

    <ConfirmDialog v-model="showDeleteConfirm" title="Delete Task"
      :message="`Are you sure you want to delete '${deletingTask?.title}'?`" type="danger" confirm-text="Delete"
      @confirm="handleDeleteTask" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import {
  Plus, FolderPlus, Tag, Folder, MoreVertical,
  Check, Calendar, Edit, Trash2
} from 'lucide-vue-next'
import TaskModal from './modals/TaskModal.vue'
import FolderModal from './modals/FolderModal.vue'
import TagModal from './modals/TagModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useTodoStore } from '@/stores/todo'
import { useDeadlineNotifications } from '@/composables/useDeadlineNotifications'

const BRAND_COLOR = '#8B5CF6'
const store = useTodoStore()
const { resetNotifications } = useDeadlineNotifications()

const todos = store.todos
const folders = store.folders
const tags = store.tags
const isLoading = store.loading

const selectedFolder = ref<string | null>(null)
const showCompleted = ref<boolean | null>(null) // null = all, false = active, true = completed
const showTaskModal = ref(false)
const showFolderModal = ref(false)
const showTagModal = ref(false)
const showDeleteConfirm = ref(false)
const editingTask = ref<any>(null)
const editingFolder = ref<any>(null)
const editingTag = ref<any>(null)
const deletingTask = ref<any>(null)
const forceUpdate = ref(0)

const totalTasksCount = computed(() => todos.value?.length || 0)
const activeCount = computed(() => todos.value?.filter(t => !t.completed).length || 0)
const completedCount = computed(() => todos.value?.filter(t => t.completed).length || 0)

const filteredTodos = computed(() => {
  forceUpdate.value
  const todoList = todos.value
  if (!todoList) return []

  let result = todoList

  // Фильтр по папке
  if (selectedFolder.value) {
    result = result.filter(t => t?.folderId === selectedFolder.value)
  }

  // Фильтр по статусу
  if (showCompleted.value !== null) {
    result = result.filter(t => t.completed === showCompleted.value)
  }

  return result
})

const getFolderTaskCount = (folderId: string) => {
  if (!folderId || !todos.value?.length) return 0
  return todos.value.filter(t => t?.folderId === folderId).length
}

const formatDate = (date: Date | string) => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return ''
  }
}

const openTaskModal = (task?: any) => {
  editingTask.value = task || null
  showTaskModal.value = true
}

const openFolderModal = (folder?: any) => {
  editingFolder.value = folder || null
  showFolderModal.value = true
}

const openTagModal = (tag?: any) => {
  editingTag.value = tag || null
  showTagModal.value = true
}

const handleSaveTask = async (data: any) => {
  try {
    if (editingTask.value) {
      await store.updateTodo(editingTask.value.id, data)
      resetNotifications(editingTask.value.id)
    } else {
      await store.addTodo(data)
    }
    forceUpdate.value++
    showTaskModal.value = false
  } catch (error) {
    console.error('Error saving task:', error)
  }
}

const handleSaveFolder = async (data: any) => {
  try {
    if (editingFolder.value) {
      await store.updateFolder(editingFolder.value.id, {
        name: data.name,
        color: data.color
      })

      if (data.taskIds?.length) {
        for (const taskId of data.taskIds) {
          await store.updateTodo(taskId, {
            folderId: editingFolder.value.id
          })
        }
      }
    } else {
      const newFolder = await store.createFolder({
        name: data.name,
        color: data.color
      })

      if (data.taskIds?.length && newFolder) {
        for (const taskId of data.taskIds) {
          await store.updateTodo(taskId, {
            folderId: newFolder.id
          })
        }
      }
    }

    forceUpdate.value++
    await nextTick()

    showFolderModal.value = false
  } catch (error) {
    console.error('❌ Error saving folder:', error)
  }
}

const handleSaveTag = async (data: any) => {
  try {
    if (editingTag.value) {
      await store.updateTag(editingTag.value.id, {
        name: data.name,
        color: data.color
      })
    } else {
      await store.createTag(data)
    }
    showTagModal.value = false
  } catch (error) {
    console.error('Error saving tag:', error)
  }
}

const handleDeleteTag = async (id: string) => {
  if (!id) return
  try {
    await store.deleteTag(id)
    showTagModal.value = false
  } catch (error) {
    console.error('Error deleting tag:', error)
  }
}

const handleDeleteFolder = async (id: string) => {
  if (!id) return
  try {
    await store.deleteFolder(id)
    showFolderModal.value = false
  } catch (error) {
    console.error('Error deleting folder:', error)
  }
}

const toggleTodo = async (todo: any) => {
  if (!todo?.id) return
  try {
    await store.updateTodo(todo.id, { completed: !todo.completed })
    resetNotifications(todo.id)
    forceUpdate.value++
  } catch (error) {
    console.error('Error toggling task:', error)
  }
}

const confirmDeleteTodo = (todo: any) => {
  deletingTask.value = todo
  showDeleteConfirm.value = true
}

const handleDeleteTask = async () => {
  if (!deletingTask.value?.id) return
  try {
    await store.deleteTodo(deletingTask.value.id)
    showDeleteConfirm.value = false
    deletingTask.value = null
  } catch (error) {
    console.error('Error deleting task:', error)
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.todo-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.todo-header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid;

  @include themify() {
    border-color: themed('border-color');

    h2 {
      color: themed('text-primary');
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
  }


  .filter-buttons {
    display: flex;
    gap: 4px;

    @include themify() {
      border-color: themed('border-color');
    }

    .filter-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 4px;

      @include themify() {
        color: themed('text-secondary');

        &:hover {
          background: themed('nav-bar-tab');
          color: themed('text-primary');
        }

        &.active {
          background: themed('brand-primary');
          color: white;

          .count {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
        }
      }

      .count {
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 4px;

        @include themify() {
          background: themed('bg-content');
          color: themed('text-secondary');
        }
      }
    }

  }

  .create-buttons {
    display: flex;
    align-items: center;
    gap: 8px;

    button {
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;

      @include themify() {
        background: themed('nav-bar-tab');
        color: themed('text-secondary');

        &:hover {
          background: themed('brand-primary') + '20';
          color: themed('brand-primary');
        }
      }

      &.new-task-btn {
        @include themify() {
          background: themed('brand-primary');
          color: white;

          &:hover {
            opacity: 0.9;
            background: themed('brand-primary');
          }
        }
      }

      &.new-folder-btn,
      &.new-tag-btn {
        background: none;

        @include themify() {
          border: 1px solid themed("border-light-color");
        }
      }
    }
  }
}

.todo-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.folders-sidebar {
  width: 240px;
  border-right: 1px solid;
  padding: 16px;
  overflow-y: auto;

  @include themify() {
    border-color: themed('border-color');
  }

  .folders-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .folder-item {
    padding: 8px 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    position: relative;
    transition: all 0.2s;

    @include themify() {
      color: themed('text-primary');

      &:hover {
        background: themed('nav-bar-tab');

        .folder-actions {
          opacity: 1;
        }
      }

      &.active {
        background: var(--folder-bg, themed('brand-primary') + '20');
        color: var(--folder-color, themed('brand-primary'));

        .count {
          background: var(--folder-bg, themed('brand-primary') + '20');
          color: var(--folder-color, themed('brand-primary'));
        }

        span {
          color: var(--folder-color, themed('brand-primary'));
        }

        svg {
          color: var(--folder-color, themed('brand-primary'));
        }
      }

      &.disabled {
        opacity: 0.5;
        cursor: default;
      }
    }

    span {
      flex: 1;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .count {
      flex: none;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s;

      @include themify() {
        background: themed('bg-content');
        color: themed('text-secondary');
      }
    }

    .folder-actions {
      opacity: 0;
      padding: 4px;
      border: none;
      background: none;
      cursor: pointer;
      transition: opacity 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;

      @include themify() {
        color: themed('text-secondary');

        &:hover {
          color: themed('text-primary');
          background: themed('bg-content');
          border-radius: 4px;
        }
      }
    }
  }
}

.tasks-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    gap: 16px;

    @include themify() {
      color: themed('text-secondary');
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;

      @include themify() {
        border-color: themed('brand-primary');
        border-top-color: transparent;
      }
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    gap: 16px;

    @include themify() {
      color: themed('text-secondary');

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .create-task-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      border: 1px solid;
      transition: all .3s ease;

      @include themify() {
        background: none;
        border-color: 1px solid themed("border-light-color");
        color: themed('brand-primary');

        &:hover {
          border-color: 1px solid themed("text-primary");
          color: themed('text-primary');
        }
      }
    }
  }

  .tasks-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .task-item {
    padding: 16px;
    border-radius: 12px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    transition: all 0.2s;

    @include themify() {
      background: themed('bg-card');
      border: 1px solid themed('border-color');

      &:hover {
        border-color: themed('brand-primary');
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        .task-actions {
          opacity: 1;
        }
      }

      &.completed {
        opacity: 0.7;

        .task-title {
          text-decoration: line-through;
        }
      }
    }

    .task-checkbox {
      padding-top: 2px;
      cursor: pointer;

      .checkbox {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        @include themify() {
          border: 2px solid themed('border-color');
          background: transparent;

          &.checked {
            background: themed('brand-primary');
            border-color: themed('brand-primary');
          }
        }
      }
    }

    .task-content {
      flex: 1;
      cursor: pointer;
      min-width: 0;

      .task-title {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;

        @include themify() {
          color: themed('text-primary');
        }
      }

      .task-description {
        font-size: 12px;
        margin-bottom: 8px;

        @include themify() {
          color: themed('text-secondary');
        }
      }

      .task-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;

          @include themify() {
            color: themed('text-secondary');

            &.overdue {
              color: themed('danger');
            }
          }

          .priority-dot {
            width: 8px;
            height: 8px;
            border-radius: 4px;
          }

          &.tags {
            .tag-pills {
              display: flex;
              align-items: center;
              gap: 4px;
            }

            .tag-pill {
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 500;
            }

            .tag-more {
              font-size: 10px;
              opacity: 0.7;
            }
          }
        }
      }
    }

    .task-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: opacity 0.2s;

      .action-btn {
        padding: 6px;
        border: none;
        border-radius: 6px;
        background: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        @include themify() {
          color: themed('text-secondary');

          &:hover {
            background: themed('nav-bar-tab');
            color: themed('text-primary');
          }

          &.delete:hover {
            color: themed('danger');
            background: themed('danger') + '20';
          }
        }
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>