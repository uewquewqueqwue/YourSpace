<template>
  <div class="form">
    <div v-if="authStore.error" class="error">
      {{ authStore.error }}
    </div>

    <div class="field" :class="{ error: getFieldError('email') }">
      <Mail :size="16" class="icon" />
      <input 
        v-model="email" 
        type="email" 
        placeholder="Email"
        :disabled="authStore.loading"
        @keyup.enter="handleSubmit"
      >
      <span v-if="getFieldError('email')" class="field-error">
        {{ getFieldError('email') }}
      </span>
    </div>
    
    <div class="field" :class="{ error: getFieldError('password') }">
      <Lock :size="16" class="icon" />
      <input 
        v-model="password" 
        type="password" 
        placeholder="Password"
        :disabled="authStore.loading"
        @keyup.enter="handleSubmit"
      >
      <span v-if="getFieldError('password')" class="field-error">
        {{ getFieldError('password') }}
      </span>
    </div>

    <button 
      class="submit-btn" 
      @click="handleSubmit"
      :disabled="authStore.loading"
    >
      <Loader v-if="authStore.loading" :size="16" class="spin" />
      <LogIn v-else :size="16" />
      {{ authStore.loading ? 'Signing in...' : 'Sign In' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Mail, Lock, LogIn, Loader } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.pinia'
import { Validator } from '@/utils/validators'
import type { ValidationError } from '@/types/errors'

const authStore = useAuthStore()
const email = ref('')
const password = ref('')
const errors = ref<ValidationError[]>([])

const emit = defineEmits(['success'])

const getFieldError = (field: string) => {
  return errors.value.find(e => e.field === field)?.message
}

const handleSubmit = async () => {
  errors.value = Validator.login(email.value, password.value)
  
  if (errors.value.length > 0) return
  
  await authStore.login(email.value, password.value)
  
  if (!authStore.error) {
    emit('success')
  }
}
</script>

<style lang="scss" scoped>
@use "@/styles/forms/forms" as *;
</style>