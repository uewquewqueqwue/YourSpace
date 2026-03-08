<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal confirm">
          <div class="confirm-icon" :style="{ background: type === 'danger' ? '#EF444420' : '#8B5CF620' }">
            <component :is="icon" :size="24" :color="type === 'danger' ? '#EF4444' : '#8B5CF6'" />
          </div>
          
          <h3>{{ title || 'Confirm' }}</h3>
          <p>{{ message || 'Are you sure?' }}</p>

          <div class="confirm-actions">
            <button class="cancel-btn" @click="close">Cancel</button>
            <button 
              class="confirm-btn" 
              :class="type || 'danger'"
              @click="confirm"
            >
              {{ confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, HelpCircle } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  title?: string
  message?: string
  type?: 'danger' | 'warning' | 'info'
  confirmText?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

const icon = computed(() => {
  return props.type === 'danger' ? AlertTriangle : HelpCircle
})

const close = () => {
  emit('update:modelValue', false)
}

const confirm = () => {
  emit('confirm')
  close()
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

.modal.confirm {
  width: 400px;
  text-align: center;
  padding: 32px;
  border-radius: 20px;
  
  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }
}

.confirm-icon {
  width: 64px;
  height: 64px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  
  @include themify() {
    color: themed('text-primary');
  }
}

p {
  font-size: 14px;
  margin-bottom: 24px;
  
  @include themify() {
    color: themed('text-secondary');
  }
}

.confirm-actions {
  display: flex;
  gap: 12px;
  transition: all .3s ease;

  button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }

  .cancel-btn {
    background: themed('border-light-color');
    
    @include themify() {
      color: themed('text-secondary');
      border: 1px solid themed('border-color');
      
      &:hover {
        color: themed("text-primary");
      }
    }
  }

  .confirm-btn {
    &.danger {
      @include themify() {
        background: themed('danger');
        color: white;
        
        &:hover {
          opacity: 0.9;
        }
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