<template>
  <Teleport to="body">
    <div v-if="isOpen" class="search-overlay" @click.self="closeSearch" @keydown.esc="closeSearch" tabindex="0">
      <div class="search-modal">
        <div class="search-input-wrapper">
          <Search :size="18" class="search-icon" />
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            placeholder="Search applications..."
            class="search-input"
            @keydown.up.prevent="navigateUp"
            @keydown.down.prevent="navigateDown"
            @keydown.enter="filteredApps[selectedIndex] && launchApp(filteredApps[selectedIndex])"
          />
          <kbd class="shortcut">ESC</kbd>
        </div>

        <div class="search-results" v-if="filteredApps.length > 0">
          <div
            v-for="(app, index) in filteredApps"
            :key="app.id"
            class="result-item"
            :class="{ selected: selectedIndex === index }"
            @click="launchApp(app)"
            @mouseenter="selectedIndex = index"
          >
            <div class="item-icon" :style="{ background: app.displayColor + '20' }">
              <span>{{ app.displayName[0].toUpperCase() }}</span>
            </div>
            <div class="item-info">
              <span class="item-name">{{ app.displayName }}</span>
              <span class="item-path">{{ formatPath(app.path) }}</span>
            </div>
            <div class="item-actions">
              <button class="action-btn launch" @click.stop="launchApp(app)" title="Launch">
                <Play :size="14" />
              </button>
            </div>
          </div>
          
          <div class="results-info">
            {{ filteredApps.length }} results found
          </div>
        </div>

        <div class="no-results" v-else-if="query">
          <p>No applications found for "{{ query }}"</p>
        </div>

        <div class="empty-state" v-else>
          <Search :size="32" />
          <p>Start typing to search your applications</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Search, Star, Play } from 'lucide-vue-next'
import { useAppsStore } from '@/stores/apps'
import { useToast } from '@/composables/useToast'
import { useSearch } from '@/composables/useSearch'

const store = useAppsStore()
const toast = useToast()
const { isOpen, closeSearch } = useSearch()

const query = ref('')
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const filteredApps = computed(() => {
  if (!query.value.trim()) return []
  const search = query.value.toLowerCase().trim()
  return store.apps.value.filter(app => 
    app.displayName.toLowerCase().includes(search) ||
    app.path.toLowerCase().includes(search)
  )
})

const formatPath = (path: string): string => {
  const parts = path.split('\\')
  return parts.slice(0, 2).join('\\') + '\\...\\' + parts.pop()
}

const navigateUp = () => {
  if (filteredApps.value.length === 0) return
  selectedIndex.value = (selectedIndex.value - 1 + filteredApps.value.length) % filteredApps.value.length
}

const navigateDown = () => {
  if (filteredApps.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % filteredApps.value.length
}

const launchApp = async (app: any) => {
  const success = await store.launchApp(app.path)
  if (success) {
    toast.success(`Launched ${app.displayName}`)
    closeSearch()
  } else {
    toast.error(`Failed to launch ${app.displayName}`)
  }
}

watch(isOpen, (newVal) => {
  if (newVal) {
    query.value = ''
    selectedIndex.value = 0
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 20000;
  padding-top: 100px;
}

.search-modal {
  width: 600px;
  max-width: 90vw;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  
  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
  }
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
  
  @include themify() {
    border-bottom: 1px solid themed('border-color');
  }
  
  .search-icon {
    @include themify() {
      color: themed('text-secondary');
    }
  }
  
  .search-input {
    flex: 1;
    background: none;
    border: none;
    font-size: 16px;
    
    @include themify() {
      color: themed('text-primary');
      
      &::placeholder {
        color: themed('text-secondary');
      }
    }
    
    &:focus {
      outline: none;
    }
  }
  
  .shortcut {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-family: monospace;
    
    @include themify() {
      background: themed('brand-dark');
      color: themed('text-secondary');
    }
  }
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  
  .result-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: 0.2s;
    
    @include themify() {
      &.selected {
        background: themed('nav-bar-tab');
      }
      
      &:hover {
        background: themed('nav-bar-tab');
      }
    }
    
    .item-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      span {
        font-size: 16px;
        font-weight: 600;
        
        @include themify() {
          color: themed('text-primary');
        }
      }
    }
    
    .item-info {
      flex: 1;
      min-width: 0;
      
      .item-name {
        display: block;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 2px;
        
        @include themify() {
          color: themed('text-primary');
        }
      }
      
      .item-path {
        display: block;
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        
        @include themify() {
          color: themed('text-secondary');
        }
      }
    }
    
    .item-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
      transition: 0.2s;
      
      .action-btn {
        padding: 6px;
        border: none;
        border-radius: 6px;
        background: none;
        cursor: pointer;
        
        @include themify() {
          color: themed('text-secondary');
          
          &:hover {
            background: themed('bg-content');
            color: themed('brand-primary');
          }
          
          &.launch:hover {
            color: themed('success');
          }
        }
      }
    }
    
    &:hover .item-actions {
      opacity: 1;
    }
  }
  
  .results-info {
    padding: 12px;
    text-align: center;
    font-size: 12px;
    
    @include themify() {
      color: themed('text-secondary');
      border-top: 1px solid themed('border-color');
    }
  }
}

.no-results,
.empty-state {
  padding: 60px 20px;
  text-align: center;
  
  @include themify() {
    color: themed('text-secondary');
  }
  
  svg {
    margin-bottom: 16px;
    
    @include themify() {
      color: themed('border-color');
    }
  }
  
  p {
    font-size: 14px;
  }
}
</style>