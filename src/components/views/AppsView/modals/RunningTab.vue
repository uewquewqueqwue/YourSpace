<template>
  <div class="running-list" ref="scrollContainer" @scroll="handleScroll">
    <div v-if="loading && processes.length === 0" class="loading">
      <div class="spinner"></div>
      <p>Loading applications...</p>
    </div>
    
    <div v-else-if="processes.length === 0" class="empty">
      <p>No applications running</p>
    </div>
    
    <template v-else>
      <div 
        v-for="proc in processes" 
        :key="proc.pid" 
        class="proc-item" 
        @click="selectApp(proc)"
      >
        <div class="icon" :style="{ background: getColor(proc.displayName) + '20' }">
          <span>{{ proc.displayName[0].toUpperCase() }}</span>
        </div>
        <span class="name">{{ proc.displayName }}</span>
        <Plus :size="16" color="#8B5CF6" />
      </div>
      
      <div v-if="loadingMore" class="loading-more">
        <div class="spinner small"></div>
        <span>Loading more...</span>
      </div>
      
      <div v-if="allLoaded" class="end-message">
        <Sparkle :size="20" />
        <span> All {{ totalCount }} applications loaded</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Sparkle } from 'lucide-vue-next'
import type { ProcessInfo } from '@/types/electron'

const emit = defineEmits<{
  (e: 'select', appData: { path: string; displayName: string }): void
}>()

const getColor = (name: string): string => {
  const colors = ['#a259ff', '#22a6f0', '#4ade80', '#f43f5e', '#fb923c', '#8b5cf6', '#ec4899', '#14b8a6']
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

const processes = ref<ProcessInfo[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const currentPage = ref(1)
const hasMore = ref(true)
const totalCount = ref(0)
const scrollContainer = ref<HTMLElement | null>(null)

const PAGE_SIZE = 20

onMounted(async () => {
  await loadTotalCount()
  await loadPage(1)
})

const loadTotalCount = async () => {
  try {
    totalCount.value = await window.electronAPI.getRunningAppsCount()
  } catch (error) {
    console.error('Failed to load count:', error)
  }
}

const loadPage = async (page: number) => {
  if (page === 1) {
    loading.value = true
  } else {
    loadingMore.value = true
  }
  
  try {
    const newProcesses = await window.electronAPI.getRunningApps({ 
      limit: PAGE_SIZE,
      page 
    })
    
    if (page === 1) {
      processes.value = newProcesses
    } else {
      processes.value = [...processes.value, ...newProcesses]
    }
    
    hasMore.value = processes.value.length < totalCount.value
    currentPage.value = page
    
  } catch (error) {
    console.error('Failed to load processes:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const handleScroll = () => {
  if (!scrollContainer.value || loadingMore.value || !hasMore.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  const threshold = 100
  
  if (scrollHeight - scrollTop - clientHeight < threshold) {
    loadPage(currentPage.value + 1)
  }
}

const allLoaded = computed(() => !hasMore.value && processes.value.length > 0)

const selectApp = (proc: ProcessInfo) => {
  emit('select', {
    path: proc.path,
    displayName: proc.displayName
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.running-list {
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  @include themify() {
    &::-webkit-scrollbar-thumb {
      background: themed('border-color');
      border-radius: 3px;
      
      &:hover {
        background: themed('text-secondary');
      }
    }
  }
}

.proc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: 0.2s;
  
  @include themify() {
    &:hover {
      background: themed('nav-bar-tab');
    }
  }

  .icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    span {
      font-size: 14px;
      font-weight: 600;
      
      @include themify() {
        color: themed('text-primary');
      }
    }
  }

  .name {
    flex: 1;
    font-size: 13px;
    
    @include themify() {
      color: themed('text-primary');
    }
  }
}

.loading, .empty {
  text-align: center;
  padding: 40px;
  
  @include themify() {
    color: themed('text-secondary');
  }
}

.loading-more {
  padding: 20px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  @include themify() {
    color: themed('text-secondary');
  }
  
  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid;
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
    
    @include themify() {
      border-color: themed('brand-primary');
    }
    
    &.small {
      width: 16px;
      height: 16px;
      border-width: 2px;
    }
  }
}

.end-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 20px;
  font-size: 14px;
  
  @include themify() {
    color: themed('text-secondary');
    border-top: 1px solid themed('border-color');
  }
}

.spinner {
  width: 30px;
  height: 30px;
  border: 2px solid;
  border-radius: 50%;
  border-top-color: transparent;
  margin: 0 auto 12px;
  animation: spin 1s linear infinite;
  
  @include themify() {
    border-color: themed('brand-primary');
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>