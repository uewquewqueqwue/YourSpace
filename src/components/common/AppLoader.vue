<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const progress = ref(0)
const status = ref('Initializing...')
const connectionStep = ref(1)

const steps = [
  { max: 20, text: 'Loading modules...', step: 1 },
  { max: 40, text: 'Connecting to services...', step: 1 },
  { max: 60, text: 'Syncing data...', step: 2 },
  { max: 80, text: 'Almost ready...', step: 2 },
  { max: 95, text: 'Finalizing...', step: 3 }
]

let interval: NodeJS.Timeout
let currentStep = 0

onMounted(() => {
  interval = setInterval(() => {
    if (currentStep < steps.length) {
      const target = steps[currentStep].max
      
      if (progress.value < target) {
        const increment = (target - progress.value) * 0.1 + Math.random() * 0.5
        progress.value = Math.min(target, progress.value + increment)
        
        status.value = steps[currentStep].text
        connectionStep.value = steps[currentStep].step
      } else {
        currentStep++
      }
    } else if (progress.value < 100) {
      progress.value = 99.9
    }
  }, 100)
})

onUnmounted(() => {
  clearInterval(interval)
})

const finish = () => {
  const finishInterval = setInterval(() => {
    if (progress.value < 100) {
      progress.value += (100 - progress.value) * 0.3
    } else {
      progress.value = 100
      status.value = 'Connected!'
      connectionStep.value = 3
      clearInterval(finishInterval)
    }
  }, 50)
}

defineExpose({ finish })
</script>

<template>
  <div class="loading-screen">
    <div class="loading-container">
      <div class="logo">
        <img src="/logo/logo.svg" alt="Your Space">
        <div class="logo-glow"></div>
      </div>

      <div class="connection-status">
        <div class="status-dot" :class="{ connected: connectionStep === 3 }"></div>
        <span>{{ status }}</span>
      </div>

      <div class="progress-container">
        <div class="progress-track"></div>
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <div class="percentage">{{ Math.floor(progress) }}%</div>

      <div class="info-bar">
        <span>Version 1.0.0</span>
        <span>© 2026</span>
      </div>
    </div>
  </div>
</template>

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
  justify-content: space-between;
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