<template>
  <div class="browse">
    <button class="browse-btn" @click="browseFile">
      <FolderOpen :size="20" />
      Select .exe file
    </button>
  </div>
</template>

<script setup lang="ts">
import { FolderOpen } from 'lucide-vue-next'
import { safeDisplayName } from '@/utils/safe'

const emit = defineEmits(['select'])

const browseFile = async () => {
  const result = await window.electronAPI?.dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Executable', extensions: ['exe'] }]
  })
  
  if (result && !result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    const fileName = filePath.split('\\').pop()?.replace('.exe', '') || ''
    
    emit('select', { 
      path: filePath, 
      displayName: fileName 
    })
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.browse-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed;
  border-radius: 8px;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  
  @include themify() {
    border-color: themed('border-color');
    color: themed('text-secondary');
    
    &:hover {
      border-color: themed('brand-primary');
      color: themed('brand-primary');
    }
  }
}
</style>