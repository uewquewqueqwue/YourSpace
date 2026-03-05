<template>
  <div class="bar">
    <div class="bar-left">
      <div class="update-indicator" @click="openPatchNotes">
        <NotebookText :size="16" />
      </div>
      
      <div class="update-indicator" v-if="hasProgramUpdate" @click="showProgramUpdate">
        <RefreshCw :size="16" />
        <span class="badge">1</span>
      </div>
    </div>

    <div class="bar-title">Your Space &bull; {{ tab }}</div>

    <div class="window-controls">
      <button class="minimize" @click="minimize"><Minus /></button>
      <button class="maximize" @click="maximize"><Square /></button>
      <button class="close" @click="close"><X /></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X, Minus, Square, NotebookText, RefreshCw } from "lucide-vue-next"
import { useToast } from '@/composables/useToast'

defineProps<{ tab: string }>()

const minimize = () => window.electronAPI?.minimize()
const maximize = () => window.electronAPI?.maximize()
const close = () => window.electronAPI?.close()
const toast = useToast()

const hasProgramUpdate = false

const openPatchNotes = () => {
  // Триггерим событие, которое поймает App.vue
  window.dispatchEvent(new CustomEvent('open-patch-notes'))
}

const showProgramUpdate = () => {
  toast.info('Program updates coming soon')
}
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

    .badge {
      position: absolute;
      top: -2px;
      right: -2px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      @include themify() {
        background: themed('brand-primary');
        color: white;
      }
    }
  }

  &-title {
    font-size: 16px;
    font-weight: 500;
    text-align: center;
    text-transform: capitalize;

    @include themify() {
      color: themed('text-secondary');
    }
  }

  .window-controls {
    -webkit-app-region: no-drag;
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