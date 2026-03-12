<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ todo ? 'Edit Task' : 'New Task' }}</h3>
            <button class="close-btn" @click="close">
              <X :size="18" />
            </button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>Title <span class="required">*</span></label>
              <input v-model="form.title" type="text" placeholder="What needs to be done?" />
            </div>

            <div class="field">
              <label>Description</label>
              <textarea v-model="form.description" rows="3" placeholder="Add details..." />
            </div>

            <div class="field">
              <label>Priority</label>
              <div class="priority-selector">
                <button v-for="p in priorities" :key="p.value" class="priority-btn"
                  :class="{ active: form.priority === p.value }" @click="form.priority = p.value">
                  {{ p.label }}
                </button>
              </div>
            </div>

            <div class="field-row">
              <div class="field half">
                <label>Due Date</label>
                <input v-model="form.dueDate" type="date" :min="today" class="calendar-btn" />
              </div>

              <div class="field half">
                <label>Time</label>
                <input 
                  v-model="form.dueTime" 
                  type="time" 
                  class="time-input"
                  :disabled="!form.dueDate"
                />
              </div>
            </div>

            <div class="field">
              <label>Folder</label>
              <div class="folder-selector">
                <button 
                  class="folder-select-trigger" 
                  @click="showFolderDropdown = !showFolderDropdown"
                  type="button"
                >
                  <div class="selected-folder">
                    <Folder :size="16" :color="selectedFolderColor" />
                    <span>{{ selectedFolderName }}</span>
                  </div>
                  <ChevronDown :size="14" class="chevron" :class="{ rotated: showFolderDropdown }" />
                </button>

                <Transition name="dropdown">
                  <div v-if="showFolderDropdown" class="folder-dropdown" ref="dropdownRef">
                    <div 
                      class="folder-option" 
                      :class="{ selected: selectedFolderId === null }"
                      @click="selectFolder(null)"
                    >
                      <Folder :size="14" :color="BRAND_COLOR" />
                      <span>No folder</span>
                    </div>
                    <div 
                      v-for="folder in folders" 
                      :key="folder.id"
                      class="folder-option"
                      :class="{ selected: selectedFolderId === folder.id }"
                      @click="selectFolder(folder.id)"
                    >
                      <Folder :size="14" :color="folder.color || BRAND_COLOR" />
                      <span>{{ folder.name }}</span>
                    </div>
                    <div class="folder-dropdown-footer">
                      <button class="create-folder-option" @click="$emit('create-folder'); showFolderDropdown = false">
                        <Plus :size="14" />
                        Create new folder
                      </button>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>

            <div class="field">
              <label>Tags</label>
              <div class="tags-selector">
                <div v-for="tag in tags" :key="tag.id" class="tag-chip"
                  :class="{ selected: selectedTags.includes(tag.id) }" :style="{
                    background: selectedTags.includes(tag.id) ? tag.color + '20' : 'transparent',
                    borderColor: tag.color || BRAND_COLOR
                  }" @click="toggleTag(tag.id)">
                  <div class="tag-dot" :style="{ background: tag.color || BRAND_COLOR }" />
                  {{ tag.name }}
                  <Check v-if="selectedTags.includes(tag.id)" :size="12" />
                  <button class="delete-btn" @click.stop="confirmDelete(tag)">
                    <Trash2 :size="12" />
                  </button>
                </div>

                <button class="create-tag-btn" @click="$emit('create-tag')">
                  <Plus :size="14" />
                  New tag
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="cancel-btn" @click="close">Cancel</button>
            <button class="save-btn" @click="save" :disabled="!form.title.trim()">
              {{ todo ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ConfirmDialog v-model="showConfirm" :title="deleteTitle" :message="deleteMessage" type="danger" confirm-text="Delete"
    @confirm="handleDeleteConfirm" />
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { X, Check, Plus, Trash2, Folder, ChevronDown } from 'lucide-vue-next'
import { ToDoPriority } from '@/types/todo'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useTodoStore } from '@/stores/todo.pinia'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import { onClickOutside } from '@vueuse/core'

const store = useTodoStore()

const props = defineProps<{
  modelValue: boolean
  todo?: any | null
  folders?: any[] | null
  tags?: any[] | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: any): void
  (e: 'create-tag'): void
  (e: 'create-folder'): void
}>()

const BRAND_COLOR = '#8B5CF6'
const priorities = [
  { value: ToDoPriority.LOW, label: 'Low' },
  { value: ToDoPriority.MEDIUM, label: 'Medium' },
  { value: ToDoPriority.HIGH, label: 'High' }
]

const today = new Date().toISOString().split('T')[0]

const form = ref({
  title: '',
  description: '',
  priority: ToDoPriority.MEDIUM,
  dueDate: '',
  dueTime: ''
})

const selectedTags = ref<string[]>([])
const selectedFolderId = ref<string | null>(null)
const showFolderDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>()

const {
  showConfirm,
  confirmDelete,
  handleDeleteConfirm,
  deleteTitle,
  deleteMessage
} = useConfirmDelete((id) => store.deleteTag(id))

const selectedFolderName = computed(() => {
  if (selectedFolderId.value === null) return 'No folder'
  const folder = props.folders?.find(f => f.id === selectedFolderId.value)
  return folder?.name || 'Unknown'
})

const selectedFolderColor = computed(() => {
  if (selectedFolderId.value === null) return BRAND_COLOR
  const folder = props.folders?.find(f => f.id === selectedFolderId.value)
  return folder?.color || BRAND_COLOR
})

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    priority: ToDoPriority.MEDIUM,
    dueDate: '',
    dueTime: ''
  }
  selectedTags.value = []
  selectedFolderId.value = null
}

const toggleTag = (tagId: string) => {
  if (selectedTags.value.includes(tagId)) {
    selectedTags.value = selectedTags.value.filter(id => id !== tagId)
  } else {
    selectedTags.value.push(tagId)
  }
}

const selectFolder = (folderId: string | null) => {
  selectedFolderId.value = folderId
  showFolderDropdown.value = false
}

watch(() => props.modelValue, async (val) => {
  if (val) await nextTick()
})

watch(() => props.todo, (todo) => {
  if (todo) {
    let dueDate = ''
    let dueTime = ''
    
    if (todo.dueDate) {
      const date = new Date(todo.dueDate)
      dueDate = date.toISOString().split('T')[0]
      
      if (date.getHours() !== 0 || date.getMinutes() !== 0) {
        dueTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }
    }
    
    form.value = {
      title: todo.title || '',
      description: todo.description || '',
      priority: todo.priority || ToDoPriority.MEDIUM,
      dueDate,
      dueTime
    }
    selectedFolderId.value = todo.folderId || null
    selectedTags.value = todo.tags?.map((t: any) => t.tag.id) || []
  } else {
    resetForm()
  }
}, { immediate: true })

const save = () => {
  if (!form.value.title.trim()) return

  let dueDateTime = null
  if (form.value.dueDate) {
    if (form.value.dueTime) {
      dueDateTime = new Date(`${form.value.dueDate}T${form.value.dueTime}:00`)
    } else {
      dueDateTime = new Date(`${form.value.dueDate}T23:59:59`)
    }
  }

  const saveData = {
    title: form.value.title.trim(),
    description: form.value.description.trim() || null,
    priority: form.value.priority,
    dueDate: dueDateTime ? dueDateTime.toISOString() : null,
    folderId: selectedFolderId.value,
    tagIds: [...selectedTags.value]
  }

  emit('save', saveData)
  close()
}

const close = () => {
  resetForm()
  emit('update:modelValue', false)
}

defineExpose({
  addTag: (tagId: string) => {
    if (!selectedTags.value.includes(tagId)) {
      selectedTags.value.push(tagId)
    }
  },
  setFolder: (folderId: string) => {
    selectedFolderId.value = folderId
  }
})

onClickOutside(dropdownRef, () => {
  showFolderDropdown.value = false
})
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
  z-index: 1000;
}

.modal {
  width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;

  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  
  @include themify() {
    &::-webkit-scrollbar-track {
      background: themed("brand-dark");
    }
  
    &::-webkit-scrollbar-thumb {
      background: themed('brand-primary');
      border-radius: 3px;
      
      &:hover {
        background: themed('text-secondary');
      }
    }
  }
}

.modal-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid;

  @include themify() {
    border-color: themed('border-color');
    background: themed('bg-card');
    
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: themed('text-primary');
    }
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
  padding: 24px 24px 0 24px;
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

  input,
  textarea {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 14px;
    outline: none;

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

  textarea {
    resize: vertical;
    min-height: 80px;
  }
}

.field-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.field.half {
  flex: 1;
  margin-bottom: 0;
}

.time-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 14px;
  outline: none;

  @include themify() {
    background: themed('brand-dark');
    border: 1px solid themed('brand-dark');
    color: themed('text-primary');

    &:focus {
      border: 1px solid themed('brand-primary');
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.calendar-btn::-webkit-calendar-picker-indicator,
.time-input::-webkit-calendar-picker-indicator,
.time-input::-webkit-inner-spin-button,
.time-input::-webkit-clear-button {
  filter: invert(1);
}

.priority-selector {
  display: flex;
  gap: 8px;

  .priority-btn {
    flex: 1;
    padding: 8px;
    border: 1px solid;
    border-radius: 8px;
    background: none;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;

    @include themify() {
      border-color: themed('border-light-color');
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

.folder-selector {
  position: relative;

  .folder-select-trigger {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid;
    border-radius: 10px;
    background: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    
    @include themify() {
      border-color: themed('border-color');
      background: themed('brand-dark');
      
      &:hover {
        border-color: themed('brand-primary');
      }
    }

    .selected-folder {
      display: flex;
      align-items: center;
      gap: 8px;
      
      span {
        font-size: 14px;
        
        @include themify() {
          color: themed('text-primary');
        }
      }
    }

    .chevron {
      transition: transform 0.2s ease;
      
      &.rotated {
        transform: rotate(180deg);
      }
      
      @include themify() {
        color: themed('text-secondary');
      }
    }
  }

  .folder-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 250px;
    overflow-y: auto;
    border-radius: 10px;
    z-index: 100;
    
    @include themify() {
      background: themed('bg-card');
      border: 1px solid themed('border-color');
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .folder-option {
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      
      @include themify() {
        color: themed('text-primary');
        background: themed('bg-card');
        
        &:hover {
          background: themed('nav-bar-tab');
        }
        
        &.selected {
          background: themed('brand-primary');
          color: white;
          
          span, svg {
            color: white;
          }
        }
      }
    }

    .folder-dropdown-footer {
      padding: 8px;
      border-top: 1px solid;
      
      @include themify() {
        border-color: themed('border-color');
        background: themed('bg-card');
      }

      .create-folder-option {
        width: 100%;
        padding: 8px;
        border: 1px dashed;
        border-radius: 8px;
        background: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 12px;
        cursor: pointer;
        
        @include themify() {
          border-color: themed('border-color');
          color: themed('text-secondary');
          background: themed('bg-card');
          
          &:hover {
            border-color: themed('brand-primary');
            color: themed('brand-primary');
            background: themed('bg-card');
          }
        }
      }
    }
  }
}

.tags-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 40px;
  padding: 4px 0;

  .delete-btn {
    padding: 6px;
    border: none;
    border-radius: 6px;
    background: none;
    cursor: pointer;

    @include themify() {
      color: themed('text-primary');
      &:hover {
        color: #EF4444;
        background: #EF444420;
      }
    }
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid;
    border-radius: 20px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    @include themify() {
      border-color: themed('border-color');
      color: themed('text-primary');
      background: themed('bg-card');

      &:hover {
        transform: translateY(-1px);
      }

      &.selected {
        border-color: currentColor;
      }
    }

    .tag-dot {
      width: 8px;
      height: 8px;
      border-radius: 4px;
    }
  }

  .create-tag-btn {
    padding: 6px 12px;
    border: 1px dashed;
    border-radius: 20px;
    background: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    cursor: pointer;

    @include themify() {
      border-color: themed('border-color');
      color: themed('text-secondary');
      background: themed('bg-card');

      &:hover {
        border-color: themed('brand-primary');
        color: themed('brand-primary');
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
    background: themed('bg-card');
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

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>