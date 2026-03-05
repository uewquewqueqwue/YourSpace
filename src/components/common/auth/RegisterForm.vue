<template>
  <div class="form">
    <div v-if="auth.error.value" class="error">
      {{ auth.error.value }}
    </div>

    <div class="field" :class="{ error: getFieldError('name') }">
      <User :size="16" class="icon" />
      <input v-model="name" type="text" placeholder="Name" :disabled="auth.loading.value" @keyup.enter="handleSubmit">
      <span v-if="getFieldError('name')" class="field-error">
        {{ getFieldError('name') }}
      </span>
    </div>

    <div class="field" :class="{ error: getFieldError('email') }">
      <Mail :size="16" class="icon" />
      <input v-model="email" type="email" placeholder="Email" :disabled="auth.loading.value"
        @keyup.enter="handleSubmit">
      <span v-if="getFieldError('email')" class="field-error">
        {{ getFieldError('email') }}
      </span>
    </div>

    <div class="field" :class="{ error: getFieldError('password') }">
      <Lock :size="16" class="icon" />
      <input v-model="password" type="password" placeholder="Password" :disabled="auth.loading.value"
        @keyup.enter="handleSubmit">
      <span v-if="getFieldError('password')" class="field-error">
        {{ getFieldError('password') }}
      </span>
    </div>

    <div class="field" :class="{ error: getFieldError('confirmPassword') }">
      <Lock :size="16" class="icon" />
      <input v-model="confirmPassword" type="password" placeholder="Confirm password" :disabled="auth.loading.value"
        @keyup.enter="handleSubmit">
      <span v-if="getFieldError('confirmPassword')" class="field-error">
        {{ getFieldError('confirmPassword') }}
      </span>
    </div>

    <button class="submit-btn" @click="handleSubmit" :disabled="auth.loading.value">
      <Loader v-if="auth.loading.value" :size="16" class="spin" />
      <LogIn v-else :size="16" />
      {{ auth.loading.value ? 'Creating account...' : 'Sign Up' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { User, Mail, Lock, LogIn, Loader } from 'lucide-vue-next'
import { useAuth } from '@/stores/auth'
import { Validator } from '@/utils/validators'
import type { ValidationError } from '@/types/errors'

const auth = useAuth()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errors = ref<ValidationError[]>([])

const emit = defineEmits(['success'])

const getFieldError = (field: string) => {
  return errors.value.find(e => e.field === field)?.message
}

const handleSubmit = async () => {
  errors.value = Validator.register(
    name.value, 
    email.value, 
    password.value, 
    confirmPassword.value
  )
  
  if (errors.value.length > 0) return
  
  await auth.register(name.value, email.value, password.value)

  if (!auth.error.value) {
    emit('success')
  }
}
</script>

<style lang="scss" scoped>
@use "@/styles/forms/forms" as *;
</style>