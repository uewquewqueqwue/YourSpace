<template>
  <div class="loading-screen">
    <div class="loading-container">
      <div class="logo">
        <img src="/logo/logo.svg" alt="Your Space">
        <div class="logo-glow"></div>
      </div>

      <div class="connection-status">
        <div class="status-dot" :class="{ connected: isConnected }"></div>
        <span>{{ status }}</span>
      </div>

      <div class="progress-container">
        <div class="progress-track"></div>
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <div class="percentage">{{ Math.floor(progress) }}%</div>

      <div class="info-bar">
        <span>YourSpace © 2026, by Uew</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)
const status = ref('Initializing...')
const isConnected = ref(false)

const steps = [
  { progress: 20, text: 'Loading modules...', duration: 300 },
  { progress: 40, text: 'Connecting to database...', duration: 200 },
  { progress: 60, text: 'Loading user data...', duration: 200 },
  { progress: 80, text: 'Checking for updates...', duration: 300 },
  { progress: 95, text: 'Finalizing...', duration: 200 }
]

let interval: NodeJS.Timeout | null = null
let currentStep = 0

const animateProgress = () => {
  if (currentStep >= steps.length) {
    isConnected.value = true
    return
  }

  const step = steps[currentStep]
  status.value = step.text

  const startProgress = progress.value
  const targetProgress = step.progress
  const duration = step.duration
  const startTime = Date.now()
  let animationId: number

  const animate = () => {
    const elapsed = Date.now() - startTime
    const percent = Math.min(elapsed / duration, 1)
    
    progress.value = startProgress + (targetProgress - startProgress) * percent

    if (percent < 1) {
      animationId = requestAnimationFrame(animate)
    } else {
      currentStep++
      animateProgress()
    }
  }

  animationId = requestAnimationFrame(animate)
  
  // Store animation ID for cleanup
  if (!interval) {
    interval = animationId as any
  }
}

onMounted(() => {
  // Start animation after a short delay
  setTimeout(() => {
    animateProgress()
  }, 100)
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})

const finish = () => {
  // Animate to 100%
  const startProgress = progress.value
  const startTime = Date.now()
  const duration = 300

  const animate = () => {
    const elapsed = Date.now() - startTime
    const percent = Math.min(elapsed / duration, 1)
    
    progress.value = startProgress + (100 - startProgress) * percent
    status.value = 'Connected!'
    isConnected.value = true

    if (percent < 1) {
      requestAnimationFrame(animate)
    }
  }

  animate()
}

defineExpose({ finish })
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  border-radius: 16px;
  overflow: hidden;
  
  @include themify() {
    background: themed('brand-dark');
  }
}

.loading-container {
  width: 300px;
  text-align: center;
}

.logo {
  position: relative;
  margin-bottom: 30px;

  img {
    width: 60px;
    height: 60px;
    animation: float 2s infinite ease-in-out;
  }

  .logo-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    filter: blur(20px);
    opacity: 0.2;
    animation: glow 2s infinite;
    
    @include themify() {
      background: themed('brand-primary');
    }
  }
}

.connection-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  
  @include themify() {
    color: themed('text-secondary');
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 1s infinite;
    
    @include themify() {
      background: themed('brand-primary');
    }

    &.connected {
      background: #43b581;
      animation: none;
    }
  }
}

.progress-container {
  height: 4px;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  margin-bottom: 8px;
  
  @include themify() {
    background: themed('border-color');
  }
}

.progress-track {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  animation: shimmer 1.5s infinite;
  opacity: 0.3;
  
  @include themify() {
    background: linear-gradient(90deg, transparent 0%, themed('brand-primary') 50%, transparent 100%);
  }
}

.progress-fill {
  position: relative;
  height: 100%;
  border-radius: 4px;
  transition: width 0.2s ease;
  z-index: 2;
  
  @include themify() {
    background: themed('brand-primary');
  }
}

.percentage {
  font-size: 12px;
  margin-bottom: 40px;
  
  @include themify() {
    color: themed('brand-primary');
  }
}

.info-bar {
  display: flex;
  justify-content: center;
  font-size: 14px;
  opacity: .5;
  
  @include themify() {
    color: themed('text-secondary');
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes glow {
  0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.1); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
