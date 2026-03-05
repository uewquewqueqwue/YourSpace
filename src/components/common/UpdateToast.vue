<template>
  <div v-if="updateState.show" class="update-toast" :class="updateState.type">
    <div class="update-content">
      <div class="update-icon">
        <component :is="iconComponent" :size="20" />
      </div>
      <div class="update-text">
        <div class="update-title">{{ updateState.title }}</div>
        <div class="update-message">{{ updateState.message }}</div>
        <div v-if="updateState.progress" class="update-progress">
          <div class="progress-bar" :style="{ width: updateState.progress + '%' }" />
        </div>
      </div>
      <div class="update-actions">
        <button 
          v-if="updateState.action" 
          class="update-btn"
          @click="updateState.action.handler"
        >
          {{ updateState.action.label }}
        </button>
        <button class="close-btn" @click="updateState.show = false">
          <X :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Download, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-vue-next'

interface UpdateState {
  show: boolean
  type: 'info' | 'success' | 'error' | 'progress'
  title: string
  message: string
  progress?: number
  action?: {
    label: string
    handler: () => void
  }
}

const updateState = ref<UpdateState>({
  show: false,
  type: 'info',
  title: '',
  message: ''
})

const iconComponent = computed(() => {
  switch (updateState.value.type) {
    case 'success': return CheckCircle
    case 'error': return AlertCircle
    case 'progress': return Download
    default: return RefreshCw
  }
})

onMounted(() => {
  window.electronAPI?.onUpdateChecking(() => {
    updateState.value = {
      show: true,
      type: 'info',
      title: 'Checking for updates',
      message: 'Looking for new version...'
    }
  })

  window.electronAPI?.onUpdateAvailable((info) => {
    updateState.value = {
      show: true,
      type: 'info',
      title: 'Update available',
      message: `Version ${info.version} is ready to download`,
      action: {
        label: 'Download',
        handler: () => window.electronAPI?.downloadUpdate()
      }
    }
  })

  window.electronAPI?.onUpdateNotAvailable(() => {
    updateState.value = {
      show: true,
      type: 'success',
      title: 'Up to date',
      message: 'You have the latest version'
    }
    setTimeout(() => {
      updateState.value.show = false
    }, 3000)
  })

  window.electronAPI?.onUpdateProgress((progress) => {
    updateState.value = {
      show: true,
      type: 'progress',
      title: 'Downloading update',
      message: `${Math.round(progress.percent)}% - ${formatBytes(progress.bytesPerSecond)}/s`,
      progress: progress.percent
    }
  })

  window.electronAPI?.onUpdateDownloaded((info) => {
    updateState.value = {
      show: true,
      type: 'success',
      title: 'Update downloaded',
      message: `Version ${info.version} is ready to install`,
      action: {
        label: 'Install now',
        handler: () => window.electronAPI?.installUpdate()
      }
    }
  })

  window.electronAPI?.onUpdateError((error) => {
    updateState.value = {
      show: true,
      type: 'error',
      title: 'Update failed',
      message: error
    }
  })
})

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.update-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 360px;
  background: #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 1000002;
  animation: slideIn 0.3s ease;
}

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

.update-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.update-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #8B5CF6;
  color: white;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.close-btn {
  padding: 6px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #888;
  cursor: pointer;
}

.close-btn:hover {
  background: #333;
  color: #fff;
}
</style>