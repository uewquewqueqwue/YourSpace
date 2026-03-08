<template>
  <div class="todo-view">
    <!-- Шапка с фильтрами и кнопкой -->
    <div class="header">
      <div class="filters">
        <button v-for="f in filters" :key="f.value" class="filter-btn" :class="{ active: currentFilter === f.value }"
          @click="currentFilter = f.value">
          {{ f.label }}
        </button>
      </div>

      <!-- Кнопка новой задачи -->
      <button class="add-btn" @click="createNewTodo">
        <Plus :size="16" />
        New Task
      </button>
    </div>

    <!-- Список задач -->
    <div class="todos-list">
      <!-- Загрузка -->
      <div v-if="loading" class="state">
        <div class="spinner" />
        <p>Loading tasks...</p>
      </div>

      <!-- Ошибка -->
      <div v-else-if="error" class="state error">
        <AlertCircle :size="32" />
        <p>{{ error }}</p>
        <button @click="fetchTodos">Retry</button>
      </div>

      <!-- Пусто -->
      <div v-else-if="!filteredTodos.length" class="state empty">
        <CheckCircle :size="32" />
        <p>No tasks yet</p>
        <button @click="todoModal.open">
          <Plus :size="16" />
          Create your first task
        </button>
      </div>

      <!-- Список задач -->
      <TransitionGroup v-else name="todo" tag="div" class="todos">
        <div v-for="todo in filteredTodos" :key="todo.id" class="todo-item" :class="{ completed: todo.completed }">
          <!-- Чекбокс -->
          <button class="check-btn" :class="{ checked: todo.completed }" @click.stop="toggleTodo(todo)">
            <Check v-if="todo.completed" :size="14" />
          </button>

          <!-- Контент (клик для редактирования) -->
          <div class="content" @click="openTodo(todo)">
            <div class="title">{{ todo.title }}</div>
            <div v-if="todo.description" class="description">
              {{ truncate(todo.description, 60) }}
            </div>

            <div class="meta">
              <span class="priority" :class="todo.priority.toLowerCase()">
                {{ todo.priority }}
              </span>

              <span v-if="todo.dueDate" class="due-date" :class="{ overdue: isOverdue(todo.dueDate) }">
                <Calendar :size="12" />
                {{ formatDate(todo.dueDate) }}
              </span>

              <span v-if="todo.tags?.length" class="tags">
                <Tag :size="12" />
                <div class="tag-chips">
                  <span v-for="tag in todo.tags.slice(0, 5)" :key="tag.id" class="tag-chip" :style="{
                    background: (tag.tag.color || '#8B5CF6') + '20',
                    color: tag.tag.color || '#8B5CF6'
                  }">{{ tag.tag.name }}
                  </span>
                  <span v-if="todo.tags.length > 5" class="tag-chip more">
                    +{{ todo.tags.length - 5 }}
                  </span>
                </div>
              </span>
            </div>
          </div>

          <!-- Кнопка удаления -->
          <button class="delete-btn" @click.stop="confirmDelete(todo)">
            <Trash2 :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>

    <!-- Модалка задачи -->
    <TodoModal v-model="todoModal.isOpen.value" :todo="editingTodo" :tags="store.tags.value" @save="handleTodoSave"
      @create-tag="openCreateTag" />

    <TagModal v-model="showTagModal" :tag="editingTag" @save="handleTagSave" />

    <ConfirmDialog v-model="showConfirm" :title="deleteTitle" :message="deleteMessage" type="danger"
      confirm-text="Delete" @confirm="handleDeleteConfirm" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Check, Trash2, Calendar, AlertCircle, CheckCircle, Tag
} from 'lucide-vue-next'
import { useTodoStore } from '@/stores/todo'
import { useModal } from '@/composables/useModal'
import { useToast } from '@/composables/useToast'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import TodoModal from './modals/TodoModal.vue'
import TagModal from './modals/TagModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

// Типы
type FilterType = 'all' | 'active' | 'completed'

// Сторы и композаблы
const store = useTodoStore()
const toast = useToast()
const todoModal = useModal()

// Состояние
const currentFilter = ref<FilterType>('all')
const editingTodo = ref<any>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Теги
const showTagModal = ref(false)
const editingTag = ref<any>(null)

// Фильтры
const filters: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' }
]

// Confirm delete
const {
  showConfirm,
  confirmDelete,
  handleDeleteConfirm,
  deleteTitle,
  deleteMessage
} = useConfirmDelete((id) => store.deleteTodo(id))

// Вычисляемые
const filteredTodos = computed(() => {
  let todos = store.todos.value || []

  if (currentFilter.value === 'active') {
    todos = todos.filter(t => !t.completed)
  } else if (currentFilter.value === 'completed') {
    todos = todos.filter(t => t.completed)
  }

  return todos
})

// Хелперы
const isOverdue = (date: Date) => {
  return new Date(date) < new Date() && new Date(date).toDateString() !== new Date().toDateString()
}

const formatDate = (date: Date) => {
  const d = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const truncate = (text: string, length: number) => {
  return text.length > length ? text.slice(0, length) + '...' : text
}

// Методы задач
const fetchTodos = async () => {
  loading.value = true
  error.value = null
  try {
    await store.fetchTodos()
  } catch (err) {
    error.value = 'Failed to load tasks'
  } finally {
    loading.value = false
  }
}

const openTodo = (todo: any) => {
  editingTodo.value = todo 
  todoModal.open()
}


const createNewTodo = () => {
  editingTodo.value = null
  todoModal.open()
}

const handleTodoSave = async (data: any) => {
  console.log('📝 Saving todo with tags:', data.tagIds)

  if (editingTodo.value) {
    await store.updateTodo(editingTodo.value.id, data)
    toast.success('Task updated')
  } else {
    await store.addTodo(data)
    toast.success('Task created')
  }
  editingTodo.value = null
}

const toggleTodo = async (todo: any) => {
  const newStatus = !todo.completed
  await store.updateTodo(todo.id, { completed: newStatus })
  toast.success(newStatus ? 'Task completed' : 'Task uncompleted')
}

const openCreateTag = () => {
  editingTag.value = null
  showTagModal.value = true
}

const handleTagSave = async (data: any) => {
  await store.createTag(data)
  toast.success('Tag saved')
  showTagModal.value = false
}

onMounted(() => {
  fetchTodos()
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.todo-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h1 {
    font-size: 24px;
    font-weight: 600;

    @include themify() {
      color: themed('text-primary');
    }
  }

  .add-btn {
    padding: 6px 12px;
    border: 1px solid;
    border-radius: 8px;
    background: none;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    cursor: pointer;

    @include themify() {
      border-color: themed('border-color');
      color: themed('text-secondary');

      &:hover {
        border-color: themed('brand-primary');
        color: themed('brand-primary');
      }
    }
  }
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;

  .filter-btn {
    padding: 6px 16px;
    border: 1px solid;
    border-radius: 20px;
    background: none;
    font-size: 13px;
    cursor: pointer;

    @include themify() {
      border-color: themed('border-color');
      color: themed('text-secondary');

      &:hover {
        border-color: themed('brand-primary');
      }

      &.active {
        background: themed('brand-primary');
        border-color: themed('brand-primary');
        color: white;
      }
    }
  }
}

.tag-chips {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 5px;

  & span {
    padding: 6px 10px;
    border-radius: $radius-sm;
  }
}

.todos-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.todos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;

  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');

    &:hover {
      border-color: themed('brand-primary');
    }

    &.completed {
      opacity: 0.6;

      .title {
        text-decoration: line-through;
      }
    }
  }

  .check-btn {
    width: 22px;
    height: 22px;
    border: 2px solid;
    border-radius: 6px;
    background: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;

    @include themify() {
      border-color: themed('border-light-color');

      &:hover {
        border-color: themed('brand-primary');
      }

      &.checked {
        background: themed('brand-primary');
        border-color: themed('brand-primary');
        color: white;
      }
    }
  }

  .content {
    flex: 1;
    min-width: 0;

    display: flex;
    flex-direction: column;
    gap: 5px;

    .title {
      font-size: 15px;
      font-weight: 500;
      margin-bottom: 4px;

      @include themify() {
        color: themed('text-primary');
      }
    }

    .description {
      font-size: 13px;
      margin-bottom: 8px;

      @include themify() {
        color: themed('text-secondary');
      }
    }

    .meta {
      display: flex;
      gap: 20px;
      font-size: 11px;

      span {
        display: inline-flex;
        align-items: center;
        gap: 4px;

        @include themify() {
          color: themed('text-secondary');
        }
      }

      .priority {
        &.low {
          color: #8B5CF6;
        }

        &.medium {
          color: #F59E0B;
        }

        &.high {
          color: #EF4444;
        }
      }

      .due-date {
        &.overdue {
          color: #EF4444;
        }
      }
    }
  }

  .delete-btn {
    padding: 6px;
    border: none;
    border-radius: 6px;
    background: none;
    cursor: pointer;
    opacity: 0;

    @include themify() {
      color: themed('text-secondary');

      &:hover {
        color: #EF4444;
        background: #EF444420;
      }
    }
  }

  &:hover .delete-btn {
    opacity: 1;
  }
}

.empty {
  button {
    padding: 10px 16px;
    border: 1px solid;
    border-radius: 8px;
    background: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;

    @include themify() {
      border-color: themed('border-color');
      color: themed('text-primary');

      &:hover {
        border-color: themed('brand-primary');
        color: themed('brand-primary');
      }
    }
  }
}

.state {
  text-align: center;
  padding: 60px 20px;

  @include themify() {
    color: themed('text-secondary');
  }

  p {
    margin-bottom: 16px;
    font-size: 14px;
  }

  button {
    padding: 8px 16px;
    border: 1px solid;
    border-radius: 8px;
    background: none;
    cursor: pointer;

    @include themify() {
      border-color: themed('border-color');
      color: themed('text-primary');

      &:hover {
        border-color: themed('brand-primary');
      }
    }
  }

  &.error {
    color: #EF4444;
  }
}

.spinner {
  width: 30px;
  height: 30px;
  border: 2px solid;
  border-radius: 50%;
  border-top-color: transparent;
  margin: 0 auto;
  animation: spin 1s linear infinite;

  @include themify() {
    border-color: themed('brand-primary');
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.todo-enter-active,
.todo-leave-active {
  transition: all 0.3s ease;
}

.todo-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.todo-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.todo-move {
  transition: transform 0.3s ease;
}
</style>