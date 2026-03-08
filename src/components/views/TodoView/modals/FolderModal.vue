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
                autofocus
              />
            </div>

            <div class="field-row">
              <div class="field half">
                <label>Icon (emoji)</label>
                <input 
                  v-model="form.icon" 
                  type="text" 
                  placeholder="📁"
                  maxlength="2"
                />
              </div>

              <div class="field half">
                <label>Color</label>
                <div class="color-picker">
                  <input 
                    v-model="form.color" 
                    type="color" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  folder?: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: any): void
}>()

const form = ref({
  name: '',
  icon: '📁',
  color: '#8B5CF6'
})

watch(() => props.folder, (folder) => {
  if (folder) {
    form.value = {
      name: folder.name || '',
      icon: folder.icon || '📁',
      color: folder.color || '#8B5CF6'
    }
  } else {
    form.value = {
      name: '',
      icon: '📁',
      color: '#8B5CF6'
    }
  }
}, { immediate: true })

const save = () => {
  if (!form.value.name.trim()) return
  
  emit('save', { ...form.value })
  close()
}

const close = () => {
  emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.modal.small {
  width: 400px;
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
</style>