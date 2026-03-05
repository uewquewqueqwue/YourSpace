import { ValidationError } from "@/types/errors"

export class Validator {
  static email(email: string): ValidationError | null {
    if (!email) {
      return { field: 'email', message: 'Email is required' }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { field: 'email', message: 'Invalid email format' }
    }
    
    return null
  }

  static password(password: string): ValidationError | null {
    if (!password) {
      return { field: 'password', message: 'Password is required' }
    }
    
    if (password.length < 8) {
      return { field: 'password', message: 'Password must be at least 8 characters' }
    }
    
    return null
  }

  static name(name: string): ValidationError | null {
    if (!name) {
      return { field: 'name', message: 'Name is required' }
    }
    
    if (name.length < 2) {
      return { field: 'name', message: 'Name must be at least 2 characters' }
    }
    
    return null
  }

  static confirmPassword(password: string, confirm: string): ValidationError | null {
    if (password !== confirm) {
      return { field: 'confirmPassword', message: 'Passwords do not match' }
    }
    return null
  }

  static login(email: string, password: string): ValidationError[] {
    const errors: ValidationError[] = []
    
    const emailError = this.email(email)
    if (emailError) errors.push(emailError)
    
    const passwordError = this.password(password)
    if (passwordError) errors.push(passwordError)
    
    return errors
  }

  static register(name: string, email: string, password: string, confirm: string): ValidationError[] {
    const errors: ValidationError[] = []
    
    const nameError = this.name(name)
    if (nameError) errors.push(nameError)
    
    const emailError = this.email(email)
    if (emailError) errors.push(emailError)
    
    const passwordError = this.password(password)
    if (passwordError) errors.push(passwordError)
    
    if (passwordError === null) {
      const confirmError = this.confirmPassword(password, confirm)
      if (confirmError) errors.push(confirmError)
    }
    
    return errors
  }
}