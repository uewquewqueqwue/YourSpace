<template>
  <div class="bar">
    <div class="bar-left">
      <div class="update-indicator" @click="openPatchNotes">
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

      <span class="version">v{{ version }}</span>
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
        <button class="close" @click="close"><X /></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { X, Minus, Square, NotebookText, RefreshCw } from "lucide-vue-next"
// import { usePatches } from '@/composables/usePatches'
import { useVersionStore } from '@/stores/version'

defineProps<{ tab: string }>()

const minimize = () => window.electronAPI?.minimize()
const maximize = () => window.electronAPI?.maximize()
const close = () => window.electronAPI?.close()
// const patches = usePatches()

const updateAvailable = ref(false)
const versionStore = useVersionStore()
const version = computed(() => versionStore.currentVersion.value)

const openPatchNotes = () => {
  window.dispatchEvent(new CustomEvent('open-patch-notes'))
}

const installUpdate = () => {
  window.electronAPI?.installUpdate()
}

onMounted(() => {
  window.electronAPI?.onUpdateDownloaded(() => {
    updateAvailable.value = true
  })
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
      // background: themed('border-color');
      color: themed('text-secondary');
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