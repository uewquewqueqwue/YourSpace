<template>
  <Teleport to="body">
    <div v-if="show" class="update-toast" :class="type">
      <div class="update-content">
        <div class="update-icon">
          <component :is="iconComponent" :size="20" />
        </div>
        <div class="update-text">
          <div class="update-title">{{ title }}</div>
          <div class="update-message">{{ message }}</div>
          <div v-if="progress !== undefined" class="update-progress">
            <div class="progress-bar" :style="{ width: progress + '%' }" />
          </div>
        </div>
        <button class="close-btn" @click="show = false">
          <X :size="16" />
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Download, RefreshCw, CheckCircle, X } from 'lucide-vue-next'

const show = ref(false)
const type = ref<'info' | 'success' | 'error' | 'progress'>('info')
const title = ref('')
const message = ref('')
const progress = ref<number>()

const iconComponent = computed(() => {
  switch (type.value) {
    case 'success': return CheckCircle
    case 'progress': return Download
    default: return RefreshCw
  }
})

onMounted(() => {
  window.electronAPI?.updater.onUpdateChecking(() => {
    
  })

  window.electronAPI?.updater.onUpdateAvailable((info) => {
    show.value = true
    type.value = 'info'
    title.value = 'Update Available'
    message.value = `Version ${info.version} is ready to download`
    
    setTimeout(() => {
      window.electronAPI?.updater.downloadUpdate()
    }, 2000)
  })

  window.electronAPI?.updater.onUpdateProgress((progressData) => {
    show.value = true
    type.value = 'progress'
    title.value = 'Downloading Update'
    message.value = `${Math.round(progressData.percent)}%`
    progress.value = progressData.percent
  })

  window.electronAPI?.updater.onUpdateDownloaded((info) => {
    show.value = true
    type.value = 'success'
    title.value = 'Update Ready'
    message.value = `Version ${info.version} will be installed on next restart`
    progress.value = undefined
    
    setTimeout(() => {
      show.value = false
    }, 5000)
  })

  window.electronAPI?.updater.onUpdateError((error) => {
    show.value = true
    type.value = 'error'
    title.value = 'Update Failed'
    message.value = error
    setTimeout(() => {
      show.value = false
    }, 3000)
  })
})
</script>

<style scoped>
.update-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  background: #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 1000002;
  animation: slideIn 0.3s ease;
  border-left: 4px solid;
}

.update-toast.info { border-left-color: #3B82F6; }
.update-toast.success { border-left-color: #10B981; }
.update-toast.error { border-left-color: #EF4444; }
.update-toast.progress { border-left-color: #8B5CF6; }

.update-content {
  display: flex;
  gap: 12px;
}

.update-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info .update-icon { background: #3B82F6; color: white; }
.success .update-icon { background: #10B981; color: white; }
.error .update-icon { background: #EF4444; color: white; }
.progress .update-icon { background: #8B5CF6; color: white; }

.update-text {
  flex: 1;
}

.update-title {
  font-weight: 600;
  font-size: 14px;
  color: #fff;
  margin-bottom: 4px;
}

.update-message {
  font-size: 12px;
  color: #aaa;
}

.update-progress {
  margin-top: 8px;
  height: 4px;
  background: #333;
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #8B5CF6;
  transition: width 0.3s ease;
}

.close-btn {
  padding: 6px;
  border: none;
  background: none;
  color: #888;
  cursor: pointer;
  align-self: flex-start;
}

.close-btn:hover {
  color: #fff;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>