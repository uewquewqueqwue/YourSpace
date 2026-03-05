import { ref } from 'vue'
import { FormErrors } from '@/types/formErrors'

export function useAuthForm(isLogin: boolean) {
  const name = ref('')
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  
  const errors = ref<FormErrors>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const validate = () => {
    let isValid = true
    errors.value = { name: '', email: '', password: '', confirmPassword: '' }

    if (!isLogin && !name.value) {
      errors.value.name = 'Name is required'
      isValid = false
    }

    if (!email.value) {
      errors.value.email = 'Email is required'
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      errors.value.email = 'Invalid email format'
      isValid = false
    }

    if (!password.value) {
      errors.value.password = 'Password is required'
      isValid = false
    } else if (!isLogin && password.value.length < 8) {
      errors.value.password = 'Password must be at least 8 characters'
      isValid = false
    }

    if (!isLogin && password.value !== confirmPassword.value) {
      errors.value.confirmPassword = 'Passwords do not match'
      isValid = false
    }

    return isValid
  }

  const reset = () => {
    name.value = ''
    email.value = ''
    password.value = ''
    confirmPassword.value = ''
    errors.value = { name: '', email: '', password: '', confirmPassword: '' }
  }

  return {
    name,
    email,
    password,
    confirmPassword,
    errors,
    validate,
    reset
  }
}