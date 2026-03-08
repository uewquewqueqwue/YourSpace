<template>
  <div class="bar">
    <div class="bar-left">
      <div class="update-indicator" @click="$emit('open-patches')">
        <NotebookText :size="16" />
      </div>

      <div 
        v-if="updateAvailable" 
        class="update-indicator update-available" 
        @click="installUpdate"
        title="Update available - click to install"
      >
        <RefreshCw :size="16" />
      </div>

      <span class="version">
        <span class="version-letter">v</span>{{ version }}
      </span>
    </div>

    <div class="bar-title">
      <span class="app-name">Your Space</span>
      <span class="separator">&bull;</span>
      <span class="tab-name">{{ tab }}</span>
    </div>

    <div class="bar-right">
      <div class="window-controls">
        <button class="minimize" @click="minimize"><Minus /></button>
        <button class="maximize" @click="maximize"><Square /></button>
        <button class="close" @click="hideTray"><X /></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { X, Minus, Square, NotebookText, RefreshCw } from "lucide-vue-next"
import packageJson from '../../../package.json'

const props = defineProps<{ tab: string }>()
const emit = defineEmits(['open-patches'])

const version = packageJson.version
const updateAvailable = ref(false)
const updateInfo = ref<any>(null)
const checkingComplete = ref(false)
const minimize = () => window.electronAPI?.window.minimize()
const maximize = () => window.electronAPI?.window.maximize()
const hideTray = () => window.electronAPI?.window.hideTray()

const installUpdate = () => {
  window.electronAPI?.updater.installUpdate()
}

onMounted(() => {
  window.electronAPI?.updater.onUpdateAvailable((info) => {
    updateInfo.value = info
    checkingComplete.value = true
  })

  window.electronAPI?.updater.onUpdateDownloaded((info) => {
    updateAvailable.value = true
    updateInfo.value = info
  })

  window.electronAPI?.updater.onUpdateNotAvailable(() => {
    updateAvailable.value = false
    checkingComplete.value = true
  })

  window.electronAPI?.updater.onUpdateError((error) => {
    console.error('Update error:', error)
    updateAvailable.value = false
    checkingComplete.value = true
  })
  
  setTimeout(() => {
    if (!checkingComplete.value) {
      checkingComplete.value = true
    }
  }, 2000)
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.bar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
  border-bottom: 1px solid;
  user-select: none;
  border-top-left-radius: $radius-lg;
  border-top-right-radius: $radius-lg;

  @include themify() {
    background: themed('bg-nav');
    border-bottom-color: themed('border-color');
  }

  &-left {
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-app-region: no-drag;
  }

  &-right {
    display: flex;
    align-items: center;
    gap: 12px;
    -webkit-app-region: no-drag;
  }

  .update-indicator {
    position: relative;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    cursor: pointer;

    @include themify() {
      color: themed('text-secondary');

      &:hover {
        background: themed('border-color');
        color: themed('text-primary');
      }
    }

    &.update-available {
      @include themify() {
        color: #10B981;
        
        &:hover {
          background: rgba(16, 185, 129, 0.2);
          color: #10B981;
        }
      }
    }
  }

  &-title {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .app-name {
      font-size: 16px;
      font-weight: 500;
      @include themify() { color: themed('text-primary'); }
    }
    
    .separator {
      @include themify() { color: themed('text-secondary'); }
    }
    
    .tab-name {
      font-size: 16px;
      font-weight: 400;
      text-transform: capitalize;
      @include themify() { color: themed('text-secondary'); }
    }
  }

  .version {
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 4px;
    @include themify() {
      color: themed('text-secondary');

      &-letter {
        color: themed('brand-primary')
      }
    }
  }

  .window-controls {
    display: flex;
    gap: 8px;

    button {
      width: 28px;
      height: 28px;
      border: none;
      background: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: 0.2s;

      @include themify() {
        color: themed('text-secondary');
      }

      &:hover {
        @include themify() {
          background: themed('border-color');
          color: themed('text-primary');
        }
      }

      &.close:hover {
        background: #e81123;
        color: white;
      }

      &.minimize svg {
        width: 22px;
      }

      &.maximize svg {
        width: 16px;
      }
    }
  }
}
</style>