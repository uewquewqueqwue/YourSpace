<template>
  <Teleport to="body">
    <div v-if="modal.isOpen.value" class="overlay" @click.self="modal.close">
      <div class="modal" ref="modal.modalRef">
        <div class="header">
          <h3>Add Application</h3>
          <button class="close" @click="modal.close">
            <X :size="18" />
          </button>
        </div>

        <div class="tabs">
          <button 
            v-for="t in tabs" 
            :key="t.id"
            :class="{ active: activeTab === t.id }" 
            @click="activeTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <div class="content">
          <RunningTab 
            v-if="activeTab === 'running'" 
            @select="handleSelect"
          />
          <BrowseTab 
            v-else 
            @select="handleSelect"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import RunningTab from './RunningTab.vue'
import BrowseTab from './BrowseTab.vue'
import { useAppsStore } from '@/stores/apps.pinia'
import { useToast } from '@/composables/useToast'
import { useModal } from '@/composables/useModal'
import { safeDisplayName } from '@/utils/safe'
import type { TabType } from '@/types/windowOptions'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'added'): void
}>()

const store = useAppsStore()
const toast = useToast()

const modal = useModal({
  onClose: () => emit('update:modelValue', false),
  closeOnClickOutside: true,
  closeOnEscape: true,
  initialOpen: props.modelValue
})

const activeTab = ref<TabType>('running')
const tabs: Array<{ id: TabType; label: string }> = [
  { id: 'running', label: 'Running' },
  { id: 'browse', label: 'Browse' }
]

watch(() => props.modelValue, (val) => {
  if (val && !modal.isOpen.value) modal.open()
  else if (!val && modal.isOpen.value) modal.close()
})

const handleSelect = async (appData: { path: string; displayName: string }) => {
  const added = await store.addApp({
    path: appData.path,
    catalogName: appData.displayName // ← Это сырое имя из exe
  })
  
  if (added) {
    toast.success(`Added ${safeDisplayName(appData.displayName)}`)
    emit('added')
    modal.close()
  } else {
    toast.error('Already added or error')
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000000;
}

.modal {
  width: 400px;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  z-index: 1000001;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalAppear 0.2s ease;
  
  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
  }
}

@keyframes modalAppear {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid;
  
  @include themify() {
    border-bottom-color: themed('border-color');
    
    h3 {
      color: themed('text-primary');
      font-size: 16px;
      font-weight: 600;
    }
  }

  .close {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.2s;
    
    @include themify() {
      color: themed('text-secondary');
      
      &:hover {
        background: themed('nav-bar-tab');
        color: themed('text-primary');
      }
    }
  }
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 16px 20px 0;
  margin-bottom: 16px;

  button {
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: 0.2s;
    
    @include themify() {
      background: themed('bg-content');
      color: themed('text-secondary');
      
      &:hover {
        background: themed('nav-bar-tab');
        color: themed('text-primary');
      }
      
      &.active {
        background: themed('brand-primary');
        color: white;
      }
    }
  }
}

.content {
  padding: 0 20px 20px;
}
</style>