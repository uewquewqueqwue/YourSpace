<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal small">
          <div class="modal-header">
            <h3>{{ folder ? 'Edit Folder' : 'New Folder' }}</h3>
            <button class="close-btn" @click="close">
              <X :size="18" />
            </button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>Name <span class="required">*</span></label>
              <input 
                v-model="form.name" 
                type="text" 
                placeholder="Work, Personal, Shopping..."
              />
            </div>

            <div class="field">
              <label>Color</label>
              <div class="color-picker">
                <input 
                  v-model="form.color" 
                  type="color" 
                />
              </div>
            </div>

            <div class="field">
              <label>Presets</label>
              <div class="color-presets">
                <button 
                  v-for="color in presetColors" 
                  :key="color"
                  class="color-btn"
                  :class="{ active: form.color === color }"
                  :style="{ background: color }"
                  @click="form.color = color"
                />
              </div>
            </div>

            <!-- ВЫБОР ТАСОК ДЛЯ ПАПКИ -->
            <div class="field" v-if="availableTodos.length > 0">
              <label>Add tasks to folder</label>
              <div class="tasks-selector">
                <div 
                  v-for="todo in availableTodos" 
                  :key="todo.id"
                  class="task-item"
                  :class="{ selected: selectedTasks.includes(todo.id) }"
                  @click="toggleTask(todo.id)"
                >
                  <div class="custom-checkbox">
                    <div class="checkbox" :class="{ checked: selectedTasks.includes(todo.id) }">
                      <Check v-if="selectedTasks.includes(todo.id)" :size="12" color="white" />
                    </div>
                  </div>
                  <span class="task-title">{{ todo.title }}</span>
                  <span v-if="todo.tags?.length" class="task-tags">
                    {{ todo.tags.length }} tags
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="folder" class="delete-btn" @click="confirmDelete">
              <Trash2 :size="14" />
              Delete
            </button>
            <button class="cancel-btn" @click="close">Cancel</button>
            <button 
              class="save-btn" 
              @click="save"
              :disabled="!form.name.trim()"
            >
              {{ folder ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ConfirmDialog
    v-model="showDeleteConfirm"
    title="Delete Folder"
    :message="`Are you sure you want to delete folder '${folder?.name}'? Tasks will be moved to Uncategorized.`"
    type="danger"
    confirm-text="Delete"
    @confirm="handleDelete"
  />
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, Trash2, Check } from 'lucide-vue-next'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const props = defineProps<{
  modelValue: boolean
  folder?: any | null
  todos?: any[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: any): void
  (e: 'delete', id: string): void
}>()

const BRAND_COLOR = '#8B5CF6'
const showDeleteConfirm = ref(false)
const selectedTasks = ref<string[]>([])

const presetColors = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6B7280'
]

const form = ref({
  name: '',
  color: BRAND_COLOR
})

// Таски которые можно добавить в папку (не в этой папке и не завершенные)
const availableTodos = computed(() => {
  if (!props.todos) return []
  return props.todos.filter(t => 
    t.folderId !== props.folder?.id && !t.completed
  )
})

watch(() => props.folder, (folder) => {
  if (folder) {
    form.value = {
      name: folder.name || '',
      color: folder.color || BRAND_COLOR
    }
    // Если редактируем, показываем таски которые уже в папке
    if (props.todos) {
      selectedTasks.value = props.todos
        .filter(t => t.folderId === folder.id)
        .map(t => t.id)
    }
  } else {
    form.value = {
      name: '',
      color: BRAND_COLOR
    }
    selectedTasks.value = []
  }
}, { immediate: true })

const toggleTask = (taskId: string) => {
  if (selectedTasks.value.includes(taskId)) {
    selectedTasks.value = selectedTasks.value.filter(id => id !== taskId)
  } else {
    selectedTasks.value.push(taskId)
  }
}

const save = () => {
  if (!form.value.name.trim()) return
  
  emit('save', {
    name: form.value.name.trim(),
    color: form.value.color,
    taskIds: selectedTasks.value // ID тасок которые нужно добавить в папку
  })
  
  close()
}

const confirmDelete = () => {
  showDeleteConfirm.value = true
}

const handleDelete = () => {
  if (props.folder) {
    emit('delete', props.folder.id)
  }
  showDeleteConfirm.value = false
  close()
}

const close = () => {
  emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000000;
}

.modal {
  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
  border-radius: 20px;
  overflow: hidden;
}

.modal.small {
  width: 450px;
}

.modal-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid;
  
  @include themify() {
    border-color: themed('border-color');
    h3 {
      color: themed('text-primary');
    }
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
  }

  .close-btn {
    padding: 6px;
    border: none;
    border-radius: 6px;
    background: none;
    cursor: pointer;
    
    @include themify() {
      color: themed('text-secondary');
      &:hover {
        background: themed('nav-bar-tab');
        color: themed('text-primary');
      }
    }
  }
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.field {
  margin-bottom: 20px;

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    
    @include themify() {
      color: themed('text-secondary');
    }

    .required {
      color: #EF4444;
      margin-left: 2px;
    }
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid;
    border-radius: 10px;
    font-size: 14px;
    background: none;
    
    @include themify() {
      background: themed('brand-dark');
      border: 1px solid themed('brand-dark');
      color: themed('text-primary');

      &:focus {
        outline: none;
        border: 1px solid themed('brand-primary');
      }

      &::placeholder {
        color: themed('text-secondary');
        opacity: 0.5;
      }
    }
  }
}

.tasks-selector {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid;
  border-radius: 10px;
  padding: 8px;
  
  @include themify() {
    border-color: themed('border-color');
    background: themed('brand-dark');
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
    
    @include themify() {
      color: themed('text-primary');
      
      &:hover {
        background: themed('nav-bar-tab');
      }
      
      &.selected {
        background: themed('brand-primary') + '20';
      }
    }

    .task-title {
      flex: 1;
      font-size: 13px;
    }

    .task-tags {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      
      @include themify() {
        background: themed('bg-content');
        color: themed('text-secondary');
      }
    }
  }
}

.modal-footer {
  padding: 20px 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid;
  
  @include themify() {
    border-color: themed('border-color');
  }

  .delete-btn {
    margin-right: auto;
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    
    @include themify() {
      background: themed('danger') + '20';
      color: themed('danger');
      
      &:hover:not(:disabled) {
        background: themed('danger') + '40';
      }
    }
  }

  button {
    padding: 10px 20px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .cancel-btn {
    background: none;
    
    @include themify() {
      color: themed('text-secondary');
      
      &:hover:not(:disabled) {
        background: themed('nav-bar-tab');
      }
    }
  }

  .save-btn {
    @include themify() {
      background: themed('brand-primary');
      color: white;
      
      &:hover:not(:disabled) {
        opacity: 0.9;
      }
    }
  }
}

.color-picker {
  input[type="color"] {
    width: 100%;
    height: 40px;
    padding: 4px;
    border-radius: 8px;
    cursor: pointer;
    
    &::-webkit-color-swatch-wrapper {
      padding: 0;
    }
    
    &::-webkit-color-swatch {
      border: none;
      border-radius: 6px;
    }
  }
}

.color-presets {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;

  .color-btn {
    width: 32px;
    height: 32px;
    border: 2px solid transparent;
    border-radius: 16px;
    cursor: pointer;
    
    @include themify() {
      &:hover {
        transform: scale(1.1);
      }
      
      &.active {
        border-color: themed('text-primary');
      }
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>