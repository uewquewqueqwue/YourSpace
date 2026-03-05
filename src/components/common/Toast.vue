<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Check, X, AlertCircle, Info } from 'lucide-vue-next'

const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
}>()

const emit = defineEmits(['close'])
const visible = ref(true)
const progress = ref(100)
let startTime: number
let remaining = props.duration || 3000
let timer: NodeJS.Timeout
let animationFrame: number

const icons = {
  success: Check,
  error: AlertCircle,
  info: Info
}

const colors = {
  success: '#10b981',
  error: '#ef4444',
  info: '#3b82f6'
}

const startTimer = () => {
  startTime = Date.now()

  const updateProgress = () => {
    const elapsed = Date.now() - startTime
    const newProgress = Math.max(0, 100 - (elapsed / remaining) * 100)
    progress.value = newProgress

    if (newProgress > 0) {
      animationFrame = requestAnimationFrame(updateProgress)
    }
  }

  animationFrame = requestAnimationFrame(updateProgress)

  timer = setTimeout(() => {
    visible.value = false
    setTimeout(() => emit('close'), 300)
  }, remaining)
}

const pauseTimer = () => {
  cancelAnimationFrame(animationFrame)
  clearTimeout(timer)
  remaining -= Date.now() - startTime
}

const resumeTimer = () => {
  startTimer()
}

onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrame)
  clearTimeout(timer)
})
</script>

<template>
  <Transition enter-active-class="toast-enter-active" leave-active-class="toast-leave-active"
    enter-from-class="toast-enter-from" leave-to-class="toast-leave-to">
    <div v-if="visible" class="toast" :class="type" @mouseenter="pauseTimer" @mouseleave="resumeTimer">
      <component :is="icons[type || 'success']" :size="18" :color="colors[type || 'success']" />

      <span class="message">{{ message }}</span>

      <button @click="visible = false" class="close">
        <X :size="14" />
      </button>

      <!-- Прогресс-бар -->
      <div class="progress-bar">
        <div class="progress-fill" :style="{
          width: progress + '%',
          backgroundColor: colors[type || 'success']
        }"></div>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  z-index: 10000;
  min-width: 300px;
  max-width: 400px;
  overflow: hidden;

  @include themify() {
    background: themed('bg-card');
    border-color: themed('border-color');
    color: themed('text-primary');
  }

  .message {
    flex: 1;
    font-size: 14px;
  }

  .close {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;

    @include themify() {
      color: themed('text-secondary');

      &:hover {
        background: themed('border-color');
        color: themed('text-primary');
      }
    }
  }

  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: transparent;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.1s linear;
    opacity: 0.5;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>