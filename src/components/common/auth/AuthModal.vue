<template>
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" ref="overlayRef" @click.self="authStore.closeLogin">
      <div class="modal" ref="modalRef">
        <button class="close-btn" @click="authStore.closeLogin">
          <X :size="18" />
        </button>

        <div class="header">
          <h2>{{ isLogin ? 'Welcome back' : 'Create account' }}</h2>
          <p>{{ isLogin ? 'Sign in to Your Space' : 'Join Your Space' }}</p>
        </div>

        <LoginForm v-if="isLogin" @success="handleSuccess" />
        <RegisterForm v-else @success="handleSuccess" />

        <div class="footer">
          <span>{{ isLogin ? "Don't have an account?" : 'Already have an account?' }}</span>
          <button class="link" @click="switchMode">
            {{ isLogin ? 'Create one' : 'Sign in' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.pinia'
import { useToast } from '@/composables/useToast'
import { useModal } from '@/composables/useModal'
import LoginForm from '@/components/common/auth/LoginForm.vue'
import RegisterForm from '@/components/common/auth/RegisterForm.vue'

const authStore = useAuthStore()
const isLogin = ref(true)
const toast = useToast()
const showModal = computed(() => authStore.showLoginModal)

const { modalRef, overlayRef, close } = useModal({
  onClose: () => authStore.closeLogin(),
  closeOnClickOutside: true,
  closeOnEscape: true
})

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showModal.value) {
    authStore.closeLogin()
  }
}

watch(() => authStore.showLoginModal, (val) => {
  if (val) {
    window.addEventListener('keydown', handleEscape)
  } else {
    window.removeEventListener('keydown', handleEscape)
  }
})

const switchMode = () => {
  isLogin.value = !isLogin.value
  authStore.error = null
}

const handleSuccess = () => {
  toast.success(isLogin.value ? `Welcome back ${authStore.user?.name}!` : 'Account created!')
  authStore.closeLogin()
  isLogin.value = true
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
  background: rgba(0, 0, 0, .7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  border-radius: $radius-lg;
  padding: 32px;
  width: 360px;
  position: relative;
  border: 1px solid;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

  @include themify() {
    background: themed('bg-card');
    border-color: themed('border-color');
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;

  @include themify() {
    color: themed('text-secondary');

    &:hover {
      background: themed('border-color');
      color: themed('text-primary');
    }
  }
}

.header {
  text-align: center;
  margin-bottom: 24px;

  @include themify() {
    color: themed('text-primary');

    p {
      color: themed('text-secondary');
      font-size: 14px;
    }
  }

  h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }
}

.footer {
  margin-top: 24px;
  text-align: center;
  font-size: 13px;

  @include themify() {
    color: themed('text-secondary');

    .link {
      background: none;
      border: none;
      color: themed('brand-primary');
      cursor: pointer;
      margin-left: 6px;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>