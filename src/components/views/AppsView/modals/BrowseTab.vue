<template>
  <div class="browse">
    <button class="browse-btn" @click="browseFile">
      <FolderOpen :size="20" />
      Select .exe file
    </button>
    <input ref="fileInput" type="file" accept=".exe" class="hidden" @change="handleFile">
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen } from 'lucide-vue-next'
import { useAppsStore } from '@/stores/apps'
import { useToast } from '@/composables/useToast'

const emit = defineEmits(['select'])

const { addTracked } = useApps()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)

const browseFile = () => fileInput.value?.click()

const handleFile = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const name = file.name.replace('.exe', '')
    const added = addTracked(name, file.path)
    
    if (added) {
      toast.success(`Added ${name}`)
      emit('select')
    } else {
      toast.info('Already added')
    }
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

.hidden {
  display: none;
}
</style>