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

            <div class="field">
              <label>Due Date</label>
              <input v-model="form.dueDate" type="date" :min="today" class="calendar-btn" />
            </div>

            <div class="field">
              <label>Tags</label>
              <div class="tags-selector">
                <div v-for="tag in tags" :key="tag.id" class="tag-chip"
                  :class="{ selected: selectedTags.includes(tag.id) }" :style="{
                    background: selectedTags.includes(tag.id) ? tag.color + '20' : 'transparent',
                    borderColor: tag.color || '#8B5CF6'
                  }" @click="toggleTag(tag.id)">
                  <div class="tag-dot" :style="{ background: tag.color || '#8B5CF6' }" />
                  {{ tag.name }}
                  <Check v-if="selectedTags.includes(tag.id)" :size="12" />
                  <button class="delete-btn" @click.stop="confirmDelete(tag)"><Trash2 :size="12"/></button>
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
  
  <ConfirmDialog v-model="showConfirm" :title="deleteTitle" :message="deleteMessage" type="danger"
  confirm-text="Delete" @confirm="handleDeleteConfirm" />
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { X, Check, Plus, Trash2 } from 'lucide-vue-next'
import { ToDoPriority } from '@/types/todo'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useTodoStore } from '@/stores/todo';
import { useConfirmDelete } from '@/composables/useConfirmDelete'

const store = useTodoStore()

const props = defineProps<{
  modelValue: boolean
  todo?: any | null
  tags?: any[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: any): void
  (e: 'create-tag'): void
}>()


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
  dueDate: ''
})

const selectedTags = ref<string[]>([])

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    priority: ToDoPriority.MEDIUM,
    dueDate: ''
  }
  selectedTags.value = []
}

const toggleTag = (tagId: string) => {
  if (selectedTags.value.includes(tagId)) {
    selectedTags.value = selectedTags.value.filter(id => id !== tagId)
  } else {
    selectedTags.value.push(tagId)
  }
}

const {
  showConfirm,
  confirmDelete,
  handleDeleteConfirm,
  deleteTitle,
  deleteMessage
} = useConfirmDelete((id) => store.deleteTag(id))

watch(() => props.modelValue, async (val) => {
  if (val) {
    await nextTick()
  }
})

watch(() => props.todo, (todo) => {
  if (todo) {
    const dueDate = todo.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : ''

    form.value = {
      title: todo.title || '',
      description: todo.description || '',
      priority: todo.priority || ToDoPriority.MEDIUM,
      dueDate
    }
    selectedTags.value = todo.tags?.map((t: any) => t.tag.id) || []
  } else {
    resetForm()
  }
}, { immediate: true })

const save = () => {
  if (!form.value.title.trim()) return

  emit('save', {
    title: form.value.title.trim(),
    description: form.value.description.trim() || null,
    priority: form.value.priority,
    dueDate: form.value.dueDate ? new Date(form.value.dueDate) : null,
    tagIds: selectedTags.value
  })

  close()
}

const close = () => {
  resetForm()
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
  width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;

  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
  padding: 24px;
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
      background: themed("brand-dark");
      border: 1px solid themed("brand-dark");

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

.calendar-btn::-webkit-calendar-picker-indicator {
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
    z-index: 999;

    @include themify() {
      color: themed('text-primary');

      &:hover {
        color: #EF4444;
        background: #EF444420;
      }
    }
  }

  .tag-chip {
    position: relative;
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
</style>