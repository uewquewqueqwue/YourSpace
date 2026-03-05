<template>
  <section v-if="store.quickApps.value.length" class="section">
    <h3>Quick Launch</h3>

    <TransitionGroup 
      name="quick" 
      tag="div" 
      class="quick-grid"
    >
      <div v-for="app in store.quickApps.value" :key="app.id" class="quick-item" :style="{ background: app.displayColor + '20' }">
        <button class="quick-btn" @click="handleLaunch(app)">
          <div class="icon">
            <img 
              v-if="app.catalog?.icon" 
              :src="app.catalog.icon" 
              :alt="app.displayName"
              class="app-icon"
            >
            <span v-else>{{ app.displayName[0].toUpperCase() }}</span>
          </div>
          <span class="name" :title="app.displayName">{{ formatName(app.displayName) }}</span>
        </button>
        
        <button class="remove-btn" @click="removeFromQuick(app.id)" title="Remove from quick launch">
          <X :size="10" />
        </button>
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useAppsStore } from '@/stores/apps'
import { useToast } from '@/composables/useToast'

const store = useAppsStore()
const toast = useToast()

const formatName = (name: string): string => {
  if (name.length > 10) {
    return name.slice(0, 8) + '...'
  }
  return name
}

const handleLaunch = async (app: any) => {
  const success = await store.launchApp(app.path)
  if (success) {
    toast.success(`Launched ${app.displayName}`)
  } else {
    toast.error(`Failed to launch ${app.displayName}`)
  }
}

const removeFromQuick = (id: string) => {
  store.removeFromQuick(id)
  toast.success('Removed from quick launch')
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.section {
  margin-top: 32px;

  h3 {
    font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;
    margin-bottom: 16px;
    
    @include themify() {
      color: themed('text-secondary');
    }
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12px;
}

/* Анимации */
.quick-enter-active {
  transition: all 0.2s ease-out;
}

.quick-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.quick-enter-to {
  opacity: 1;
  transform: scale(1);
}

.quick-leave-active {
  transition: all 0.2s ease-in;
  position: absolute;
}

.quick-leave-from {
  opacity: 1;
  transform: scale(1);
}

.quick-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

.quick-move {
  transition: all 0.3s ease;
}

.quick-item {
  position: relative;
  border-radius: $radius-lg;
}

.quick-btn {
  width: 100%;
  // border: 1px solid;
  border-radius: $radius-lg;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  
  @include themify() {
    // background: themed('bg-card');
    // border-color: themed('border-color');
    color: themed('text-secondary');
    
    &:hover {
      border-color: themed('brand-primary');
    }
  }

  .icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    .app-icon {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    span {
      font-size: 18px;
      font-weight: 600;
      
      @include themify() {
        color: themed('text-primary');
      }
    }
  }

  .name {
    font-size: 11px;
  }
}

.remove-btn {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: 0.2s;
  
  @include themify() {
    background: themed('brand-primary');
    color: white;
  }
}

.quick-item:hover .remove-btn {
  opacity: 1;
}

.quick-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.quick-fade-enter-from {
  opacity: 0;
  transform: scale(0.6);
}

.quick-fade-enter-to {
  opacity: 1;
  transform: scale(1);
}

.quick-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
}

.quick-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.quick-fade-leave-to {
  opacity: 0;
  transform: scale(0.4);
}

.quick-fade-move {
  transition: transform 0.3s ease;
}
</style>