<template>
  <section class="section">
    <div class="section-header">
      <h3>My Applications</h3>
      <button class="add-btn" @click="$emit('add')">
        <Plus :size="16" />
        Add
      </button>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading apps...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="fetchApps">Retry</button>
    </div>

    <div v-else-if="apps.length === 0" class="empty">
      <LayoutGrid :size="32" />
      <p>No applications added yet</p>
      <button @click="$emit('add')">
        <Plus :size="16" />
        Add your first app
      </button>
    </div>

    <div v-else class="apps-grid">
      <div v-for="app in apps" :key="app.id" class="app-card">
        <div class="card-header">
          <div class="icon" :style="{ background: app.displayColor + '20' }">
            <img 
              v-if="app.catalog?.icon" 
              :src="app.catalog.icon" 
              :alt="safeDisplayName(app.displayName)"
              class="app-icon"
            >
            <span v-else>{{ safeFirstChar(app.displayName) }}</span>
          </div>
          <div class="actions">
            <button v-if="!store.isInQuick(app.id)" @click="addToQuick(app.id)" class="action-btn quick" title="Add to quick launch">
              <Star :size="14" />
            </button>
            <button @click="editApp(app)" class="action-btn">
              <Edit :size="14" />
            </button>
            <button @click="handleRemoveApp(app)" class="action-btn delete">
              <Trash2 :size="14" />
            </button>
            <div v-if="app.isActive" class="running-indicator" title="Application is running">
              <span class="dot"></span>
              <span class="running-text">Running</span>
            </div>
          </div>
        </div>

        <div class="card-body" @click="handleLaunchApp(app.path, app.displayName)">
          <h3 :title="app.displayName">{{ safeDisplayName(app.displayName) }}</h3>
          <p class="path" :title="app.path">{{ formatPath(app.path) }}</p>

          <div class="stats">
            <div class="stat">
              <Clock :size="12" />
              <span>{{ formatTime(displayTotal(app)) }}</span>
            </div>
            <div v-if="app.lastUsed" class="stat">
              <Calendar :size="12" />
              <span>{{ formatDate(app.lastUsed) }}</span>
            </div>
            <div v-if="app.isActive" class="stat live-time">
              <ChartCandlestick :size="12" />
              <span>Current session: {{ formatLiveTime(app) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <ConfirmDialog
    v-model="showConfirm"
    :title="deleteTitle"
    :message="deleteMessage"
    type="danger"
    confirm-text="Remove"
    @confirm="handleDeleteConfirm"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Plus, Edit, Trash2, Clock, Calendar, Star, ChartCandlestick, LayoutGrid } from 'lucide-vue-next'
import { useAppsStore } from '@/stores/apps'
import { useToast } from '@/composables/useToast'
import { safeFirstChar, safeDisplayName } from '@/utils/safe'
import { useConfirmDelete } from '@/composables/useConfirmDelete'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const store = useAppsStore()
const toast = useToast()
const currentTime = ref(Date.now())

defineEmits(['add'])

const { apps, loading, error, fetchApps, removeApp, launchApp } = store

let timerInterval: NodeJS.Timeout
const { 
  showConfirm, 
  confirmDelete, 
  handleDeleteConfirm, 
  deleteTitle, 
  deleteMessage 
} = useConfirmDelete((id) => removeApp(id))

const formatPath = (path: string): string => {
  const parts = path.split('\\')
  return parts.slice(0, 2).join('\\') + '\\...\\' + parts.pop()
}

const formatTime = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

const formatLiveTime = (app: any): string => {
  if (!app.isActive || !app.currentSession) return ''
  
  const startTime = new Date(app.currentSession.startTime).getTime()
  const now = currentTime.value || Date.now()
  const elapsed = Math.max(0, Math.floor((now - startTime) / 1000))
  
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  } else {
    return `${seconds}s`
  }
}

const getCurrentSessionMinutes = (app: any): number => {
  if (!app.isActive || !app.currentSession) return 0
  const startTime = new Date(app.currentSession.startTime).getTime()
  return Math.max(0, Math.floor((currentTime.value - startTime) / 60000))
}

const displayTotal = (app: any) => {
  return app.totalMinutes + (app.isActive ? getCurrentSessionMinutes(app) : 0)
}

const formatDate = (date: Date | string): string => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString()
}

const handleRemoveApp = (app: any) => {
  confirmDelete(app, `This will remove ${app.displayName} from your list`)
}

const handleLaunchApp = async (path: string, name: string) => {
  const success = await launchApp(path)
  const safeName = safeDisplayName(name)
  if (success) {
    toast.success(`Launched ${safeName}`)
  } else {
    toast.error(`Failed to launch ${safeName}`)
  }
}

const addToQuick = (id: string) => {
  store.addToQuick(id)
  toast.success('Added to quick launch')
}

const editApp = (app: any) => {
  toast.info(`Edit ${safeDisplayName(app.displayName)} coming soon`)
}

onMounted(() => {
  currentTime.value = Date.now()
  
  timerInterval = setInterval(() => {
    currentTime.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;

    @include themify() {
      color: themed('text-secondary');
    }
  }

  .add-btn {
    padding: 6px 12px;
    border: 1px solid;
    border-radius: 8px;
    background: none;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
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
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.app-card {
  border: 1px solid;
  border-radius: 12px;
  padding: 16px;

  @include themify() {
    background: themed('bg-card');
    border-color: themed('border-color');
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;

    .icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 6px;

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

    .actions {
      display: flex;
      align-items: center;
      gap: 4px;

      .running-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        border-radius: 20px;

        @include themify() {
          background: themed('success') + '20';
          color: themed('success');
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;

          @include themify() {
            background: themed('brand-primary');
          }
        }

        .running-text {
          font-size: 8px;
          letter-spacing: .5px;
          font-weight: 600;
          text-transform: uppercase;

          @include themify() {
            color: themed('brand-primary');
          }
        }
      }

      .action-btn {
        padding: 6px;
        border: none;
        border-radius: 6px;
        background: none;
        cursor: pointer;

        @include themify() {
          color: themed('text-secondary');

          &:hover {
            background: themed('nav-bar-tab');
            color: themed('text-primary');
          }

          &.quick:hover {
            color: themed('brand-primary');
          }

          &.delete:hover {
            color: themed('danger');
          }
        }
      }
    }
  }

  .card-body {
    cursor: pointer;

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;

      @include themify() {
        color: themed('text-primary');
      }
    }

    .path {
      font-size: 11px;
      margin-bottom: 12px;

      @include themify() {
        color: themed('text-secondary');
      }
    }

    .stats {
      display: flex;
      gap: 12px;
      font-size: 11px;

      .stat {
        display: flex;
        align-items: center;
        gap: 4px;

        @include themify() {
          color: themed('text-secondary');
        }

        &.live-time {
          @include themify() {
            color: themed('success');
          }
        }
      }
    }
  }
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 60px;

  @include themify() {
    color: themed('text-secondary');
  }

  p {
    margin-bottom: 16px;
    font-size: 14px;
  }

  button {
    padding: 10px 16px;
    border: 1px solid;
    border-radius: 8px;
    background: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;

    @include themify() {
      border-color: themed('border-color');
      color: themed('text-primary');

      &:hover {
        border-color: themed('brand-primary');
        color: themed('brand-primary');
      }
    }
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
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: .3;
    transform: scale(1.13);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>