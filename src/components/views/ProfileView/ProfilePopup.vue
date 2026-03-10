<template>
  <div class="profile-popup">
    <button class="trigger-btn" @click.stop="handleTriggerClick">
      <div class="avatar" :class="{ 'has-user': !!user }">
        <img v-if="user?.avatar" :src="user.avatar" :alt="user.name">
        <User v-else :size="22" />
      </div>
    </button>

    <Teleport to="body">
      <Transition name="popup">
        <div v-if="isOpen" class="popup-overlay" ref="overlayRef" @click.self="close">
          <div class="popup" ref="modalRef" @click.stop>
            <div class="popup-header">
              <div class="avatar-wrapper" @click="triggerFileInput">
                <div class="avatar-large">
                  <img v-if="previewAvatar || user?.avatar" :src="previewAvatar || user?.avatar" :alt="user?.name">
                  <User v-else :size="32" />
                  <div class="avatar-overlay">
                    <Camera :size="18" />
                  </div>
                </div>
                <input 
                  ref="fileInput"
                  type="file" 
                  accept="image/*"
                  class="hidden-input"
                  @change="handleAvatarChange"
                >
              </div>
              
              <div class="info-section">
                <div class="name-display">
                  <h4>{{ user?.name || 'User' }}</h4>
                  <p class="email">{{ user?.email }}</p>
                </div>
              </div>
            </div>

            <div class="popup-body">
              <div class="edit-field">
                <label>Display name</label>
                <input 
                  v-model="editedName" 
                  type="text" 
                  :placeholder="user?.name || 'Enter your name'"
                >
              </div>
            </div>

            <div class="popup-footer">
              <button class="save-btn" @click="saveChanges" :disabled="!hasChanges || isSaving">
                <Check :size="16" />
                {{ isSaving ? 'Saving...' : 'Save changes' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { User, Camera, Check } from 'lucide-vue-next'
import { useAuth } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useModal } from '@/composables/useModal'

const auth = useAuth()
const toast = useToast()
const user = computed(() => auth.user.value)

const { isOpen, close, open, modalRef, overlayRef } = useModal()

const fileInput = ref<HTMLInputElement | null>(null)

const editedName = ref('')
const previewAvatar = ref('')
const originalName = ref('')
const originalAvatar = ref('')
const isSaving = ref(false)

const hasChanges = computed(() => {
  return editedName.value !== originalName.value || previewAvatar.value !== ''
})

const handleTriggerClick = () => {
  if (!user.value) {
    auth.openLogin()
    return
  }
  
  open()
  editedName.value = user.value.name || ''
  originalName.value = user.value.name || ''
  originalAvatar.value = user.value.avatar ?? ''
  previewAvatar.value = ''
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleAvatarChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large (max 10mb)")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      previewAvatar.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const saveChanges = async () => {
  if (isSaving.value) return
  if (!user.value) return
  
  isSaving.value = true
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Not authenticated')
      return
    }
    
    const updates: any = {}
    
    if (editedName.value !== originalName.value && editedName.value.trim()) {
      updates.name = editedName.value.trim()
    }
    
    if (previewAvatar.value) {
      updates.avatar = previewAvatar.value
    }
    
    if (Object.keys(updates).length === 0) {
      toast.info('No changes to save')
      return
    }
    
    const result = await window.electronAPI.db.updateProfile(token, updates)
    
    auth.user.value = result
    
    originalName.value = result.name || ''
    originalAvatar.value = result.avatar ?? ''
    
    toast.success('Profile updated')
    close()
    
  } catch (error) {
    console.error('Save error:', error)
    toast.error('Failed to update profile')
  } finally {
    isSaving.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.profile-popup {
  display: inline-block;
}

.trigger-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;

    @include themify() {
      color: themed('text-secondary');
      
      &:hover {
        background: themed('nav-bar-tab');
        color: white;
      }
      
      &.has-user {
        background: transparent;
        
        &:hover {
          background: themed('nav-bar-tab');
        }
      }
    }

    img {
      width: 28px;
      height: 28px;
      border-radius: $radius-sm;
      object-fit: cover;
    }
  }
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  pointer-events: none;
}

.popup {
  position: absolute;
  left: 80px;
  top: 60px;
  width: 280px;
  border-radius: 16px;
  overflow: hidden;
  pointer-events: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  
  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
  }
}

.popup-header {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  
  @include themify() {
    border-bottom: 1px solid themed('border-color');
  }
}

.avatar-wrapper {
  cursor: pointer;
}

.avatar-large {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  
  @include themify() {
    background: themed('nav-bar-tab');
    border: 3px solid themed('bg-card');
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    width: 100%;
    height: 100%;
    padding: 20px;
    
    @include themify() {
      color: themed('text-secondary');
    }
  }

  .avatar-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: 0.2s;
    
    @include themify() {
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border-radius: 50%;
    }
  }

  &:hover .avatar-overlay {
    opacity: 1;
  }
}

.info-section {
  text-align: center;
  width: 100%;
}

.name-display {
  h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
    
    @include themify() {
      color: themed('text-primary');
    }
  }

  .email {
    font-size: 12px;
    
    @include themify() {
      color: themed('text-secondary');
    }
  }
}

.popup-body {
  padding: 16px 20px;
}

.edit-field {
  label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 6px;
    
    @include themify() {
      color: themed('text-secondary');
    }
  }

  input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
    
    @include themify() {
      background: themed('bg-content');
      border-color: themed('border-color');
      color: themed('text-primary');
      
      &:focus {
        border-color: themed('brand-primary');
      }
    }
  }
}

.popup-footer {
  padding: 16px 20px 20px;

  .save-btn {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: 0.2s;
    
    @include themify() {
      background: themed('brand-primary');
      color: white;
      
      &:hover:not(:disabled) {
        filter: brightness(1.1);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

.hidden-input {
  display: none;
}

.popup-enter-active,
.popup-leave-active {
  transition: all 0.2s ease;
}

.popup-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.popup-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>