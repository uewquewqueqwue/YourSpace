<template>
  <div class="storage-indicator" :class="{ expanded }" @click="expanded = !expanded">
    <div class="icon">
      <HardDrive :size="16" />
    </div>
    
    <div class="info" v-if="expanded">
      <div class="header">
        <span class="label">Local Storage</span>
        <span class="percentage">{{ percentage }}%</span>
      </div>
      
      <div class="progress-bar">
        <div class="progress" :style="{ width: percentage + '%' }"></div>
      </div>
      
      <div class="details-counts">
        <span class="apps-count">{{ appsCount }} apps</span>
        <span class="apps-count">{{ todosCount }} todos</span>
      </div>

      <div class="details">
        <span>{{ formatBytes(used) }} / {{ formatBytes(total) }}</span>
        <button class="apps-btn" @click="handleReset">Clear storage</button>
      </div>
    </div>
    
    <div class="compact" v-else>
      <span class="compact-percentage">{{ percentage }}%</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { HardDrive } from 'lucide-vue-next'
import { useAppsStore } from '@/stores/apps.pinia'
import { useTodoStore } from '@/stores/todo.pinia'
import { useAuthStore } from '@/stores/auth.pinia'

const expanded = ref(false)
const appsStore = useAppsStore()
const todosStore = useTodoStore()

const storageInfo = computed(() => {
  let total = 5 * 1024 * 1024
  let used = 0
  let items = 0
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          used += key.length * 2 + value.length * 2
          items++
        }
      }
    }
  } catch (e) {
    // 
  }
  
  return { used, total }
})

const used = computed(() => storageInfo.value.used)
const total = computed(() => storageInfo.value.total)
const percentage = computed(() => {
  const raw = (used.value / total.value) * 100
  return raw.toFixed(1)
})

const appsCount = computed(() => appsStore.apps.length)
const todosCount = computed(() => todosStore.todos.length)

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleReset = () => {
  appsStore.reset()
  todosStore.reset()
  localStorage.removeItem("patch_seen_version")
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  
  const authStore = useAuthStore()
  authStore.logout()
  
  setTimeout(() => {
    window.electronAPI?.relaunchApp()
  }, 100)
}
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.storage-indicator')) {
      expanded.value = false
    }
  }
  
  document.addEventListener('click', handleClickOutside)
  return () => document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.storage-indicator {
  position: fixed;
  bottom: 20px;
  right: 20px;
  border-radius: $radius-lg;
  padding: 10px 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all .3s ease;
  z-index: 1000;
  
  @include themify() {
    background: themed('bg-card') + 'e6';
    border: 1px solid themed('border-color');
    color: themed('text-primary');
    
    &:hover {
      border-color: themed('brand-primary');
    }
  }
  
  &.expanded {
    width: 250px;
  }
  
  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .info {
    margin-top: 8px;
    // padding: 8px 0;
    
    .header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
      
      .label {
        @include themify() {
          color: themed('text-secondary');
        }
      }
      
      .percentage {
        font-weight: 600;
      }
    }
    
    .progress-bar {
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      
      @include themify() {
        background: themed('border-color');
      }
      
      .progress {
        height: 100%;
        transition: width 0.3s ease;
        
        @include themify() {
          background: themed('brand-primary');
        }
      }
    }

    .details, .details-counts {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      
      @include themify() {
        color: themed('text-secondary');
      }
      
      .apps-count {
        @include themify() {
          color: themed('brand-primary');
        }
      }

      .apps-btn {
        padding: 6px;
        outline: none;
        border: none;
        border-radius: 6px;
        cursor: pointer;

        @include themify() {
          background: themed('bg-card');
          color: themed("text-primary");
        }
      }
    }

    .details-counts {
      justify-content: center;
      gap: 15px;
      margin-bottom: 10px;
    }

  }

  
  .compact {    
    margin-top: 8px;
    .compact-percentage {
      font-size: 12px;
      font-weight: 600;
      
      @include themify() {
        color: themed('brand-primary');
      }
    }
  }
}
</style>