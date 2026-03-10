<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal small">
          <div class="modal-header">
            <h3>{{ tag ? 'Edit Tag' : 'New Tag' }}</h3>
            <button class="close-btn" @click="close">
              <X :size="18" />
            </button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>Name <span class="required">*</span></label>
              <input v-model="form.name" type="text" placeholder="urgent, bug, feature..." />
            </div>

            <div class="field">
              <label>Color (hex)</label>
              <input v-model="form.color" type="text" placeholder="#8B5CF6" @input="validateColor" />
              <div class="color-preview" :style="{ background: validColor }" />
              <div v-if="colorError" class="color-error">
                Invalid color, using default
              </div>
            </div>

            <div class="field">
              <label>Presets</label>
              <div class="color-presets">
                <button v-for="color in presetColors" :key="color" class="color-btn"
                  :class="{ active: form.color === color }" :style="{ background: color }" @click="setColor(color)" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="cancel-btn" @click="close">Cancel</button>
            <button class="save-btn" @click="save" :disabled="!form.name.trim()">
              {{ tag ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  tag?: any | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', data: any): void
  (e: 'delete', id: string): void
}>()

const BRAND_COLOR = '#8B5CF6'

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

const colorError = ref(false)

const isValidHex = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

const validateColor = () => {
  if (!form.value.color) {
    form.value.color = BRAND_COLOR
    colorError.value = false
    return
  }

  if (!isValidHex(form.value.color)) {
    colorError.value = true
  } else {
    colorError.value = false
  }
}

const setColor = (color: string) => {
  form.value.color = color
  colorError.value = false
}

const validColor = computed(() => {
  if (!form.value.color) return BRAND_COLOR
  return isValidHex(form.value.color) ? form.value.color : BRAND_COLOR
})

watch(() => props.tag, (tag) => {
  if (tag) {
    form.value = {
      name: tag.name || '',
      color: tag.color || BRAND_COLOR
    }
  } else {
    form.value = {
      name: '',
      color: BRAND_COLOR
    }
  }
  colorError.value = false
}, { immediate: true })

const save = () => {
  if (!form.value.name.trim()) return

  const finalColor = isValidHex(form.value.color) ? form.value.color : BRAND_COLOR

  emit('save', {
    name: form.value.name.trim(),
    color: finalColor
  })

  form.value = {
    name: '',
    color: BRAND_COLOR
  }
  colorError.value = false

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
  width: 400px;
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

.color-preview {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  margin-top: 8px;
  border: 1px solid;

  @include themify() {
    border-color: themed('border-color');
  }
}

.color-error {
  font-size: 11px;
  margin-top: 4px;
  color: #EF4444;
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