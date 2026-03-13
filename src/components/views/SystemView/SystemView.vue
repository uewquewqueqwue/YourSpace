<template>
  <div class="system-view">
    <div class="system-header">
      <button @click="refreshStats" :disabled="loading" class="refresh-btn">
        <RefreshCw :size="16" :class="{ spinning: loading }" />
        Refresh
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="stats" class="stats-grid">
      <!-- CPU Card -->
      <div class="stat-card">
        <div class="card-header">
          <Cpu :size="20" />
          <span>CPU</span>
        </div>
        <div class="card-content">
          <div class="progress-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" class="progress-bg" />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                class="progress-bar"
                :style="{ strokeDashoffset: getCircleOffset(stats.cpu.usage) }"
              />
            </svg>
            <div class="progress-text">
              <span class="value">{{ stats.cpu.usage }}%</span>
            </div>
          </div>
          <div class="stat-details">
            <div class="detail-item">
              <span class="label">Cores:</span>
              <span class="value">{{ stats.cpu.cores }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Memory Card -->
      <div class="stat-card">
        <div class="card-header">
          <HardDrive :size="20" />
          <span>Memory</span>
        </div>
        <div class="card-content">
          <div class="progress-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" class="progress-bg" />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                class="progress-bar"
                :style="{ strokeDashoffset: getCircleOffset(stats.memory.usagePercent) }"
              />
            </svg>
            <div class="progress-text">
              <span class="value">{{ stats.memory.usagePercent }}%</span>
            </div>
          </div>
          <div class="stat-details">
            <div class="detail-item">
              <span class="label">Used:</span>
              <span class="value">{{ formatBytes(stats.memory.used) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Total:</span>
              <span class="value">{{ formatBytes(stats.memory.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Disk Card -->
      <div class="stat-card" v-for="(disk, index) in (stats.disks || [stats.disk])" :key="disk.mount">
        <div class="card-header">
          <Database :size="20" />
          <span>Disk {{ disk.mount }}</span>
        </div>
        <div class="card-content">
          <div class="progress-circle">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" class="progress-bg" />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                class="progress-bar"
                :style="{ strokeDashoffset: getCircleOffset(disk.usagePercent) }"
              />
            </svg>
            <div class="progress-text">
              <span class="value">{{ disk.usagePercent }}%</span>
            </div>
          </div>
          <div class="stat-details">
            <div class="detail-item">
              <span class="label">Used:</span>
              <span class="value">{{ formatBytes(disk.used) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Total:</span>
              <span class="value">{{ formatBytes(disk.total) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Network Card -->
      <div class="stat-card">
        <div class="card-header">
          <Network :size="20" />
          <span>Network</span>
        </div>
        <div class="card-content network-content">
          <div class="network-stat">
            <ArrowDown :size="16" />
            <div>
              <div class="network-label">Download</div>
              <div class="network-value">{{ formatBytes(stats.network.rx) }}/s</div>
            </div>
          </div>
          <div class="network-stat">
            <ArrowUp :size="16" />
            <div>
              <div class="network-label">Upload</div>
              <div class="network-value">{{ formatBytes(stats.network.tx) }}/s</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- System Info -->
    <div v-if="stats" class="system-info">
      <h2>System Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Platform:</span>
          <span class="info-value">{{ stats.os.platform }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Distribution:</span>
          <span class="info-value">{{ stats.os.distro }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Release:</span>
          <span class="info-value">{{ stats.os.release }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Architecture:</span>
          <span class="info-value">{{ stats.os.arch }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Hostname:</span>
          <span class="info-value">{{ stats.os.hostname }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Uptime:</span>
          <span class="info-value">{{ formatUptime(stats.uptime) }}</span>
        </div>
      </div>
    </div>

    <div v-if="!stats && !loading" class="loading-state">
      <Cpu :size="48" />
      <p>Loading system stats...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Cpu, HardDrive, Database, Network, RefreshCw, ArrowDown, ArrowUp } from 'lucide-vue-next'

interface SystemStats {
  cpu: { usage: number; cores: number }
  memory: { total: number; used: number; free: number; usagePercent: number }
  disk: { total: number; used: number; free: number; usagePercent: number; mount: string }
  disks?: Array<{ total: number; used: number; free: number; usagePercent: number; mount: string }>
  network: { rx: number; tx: number }
  os: { platform: string; distro: string; release: string; arch: string; hostname: string }
  uptime: number
}

const stats = ref<SystemStats | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let refreshInterval: NodeJS.Timeout | null = null

const loadStats = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await window.electronAPI.system.getStats()

    if (response.success && response.stats) {
      stats.value = response.stats
    } else {
      error.value = response.error || 'Failed to load system stats'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load system stats'
  } finally {
    loading.value = false
  }
}

const refreshStats = () => {
  loadStats()
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

const getCircleOffset = (percent: number): number => {
  const circumference = 2 * Math.PI * 45
  return circumference - (percent / 100) * circumference
}

onMounted(() => {
  loadStats()
  // Refresh every 10 seconds to reduce memory usage
  refreshInterval = setInterval(loadStats, 10000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.system-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
  gap: 24px;
}

.system-header {
  display: flex;
  justify-content: end;
  align-items: center;

  h1 {
    font-size: 24px;
    font-weight: 500;
    margin: 0;

    @include themify() {
      color: themed('text-primary');
    }
  }

  .refresh-btn {
    padding: 8px 16px;
    border-radius: 8px;
    border: none;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;

    @include themify() {
      background: themed('brand-primary');
      color: white;

      &:hover:not(:disabled) {
        opacity: 0.9;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .spinning {
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;

  @include themify() {
    background: rgba(255, 0, 0, 0.1);
    color: themed('danger');
    border: 1px solid themed('danger') + '40';
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.stat-card {
  border-radius: 12px;
  padding: 20px;
  
  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    font-weight: 500;

    @include themify() {
      color: themed('text-primary');
    }
  }

  .card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  .progress-circle {
    position: relative;
    width: 120px;
    height: 120px;

    svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    circle {
      fill: none;
      stroke-width: 8;
      stroke-linecap: round;
    }

    .progress-bg {
      @include themify() {
        stroke: themed('brand-dark');
      }
    }

    .progress-bar {
      stroke-dasharray: 282.7;
      transition: stroke-dashoffset 0.5s ease;

      @include themify() {
        stroke: themed('brand-primary');
      }
    }

    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;

      .value {
        font-size: 24px;
        font-weight: 600;

        @include themify() {
          color: themed('text-primary');
        }
      }
    }
  }

  .stat-details {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;

    .label {
      @include themify() {
        color: themed('text-secondary');
      }
    }

    .value {
      font-weight: 500;

      @include themify() {
        color: themed('text-primary');
      }
    }
  }

  .network-content {
    width: 100%;
    gap: 20px;
  }

  .network-stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;

    @include themify() {
      background: themed('brand-dark');
      color: themed('brand-primary');
    }

    .network-label {
      font-size: 12px;

      @include themify() {
        color: themed('text-secondary');
      }
    }

    .network-value {
      font-size: 16px;
      font-weight: 600;

      @include themify() {
        color: themed('text-primary');
      }
    }
  }
}

.system-info {
  h2 {
    font-size: 18px;
    font-weight: 500;
    margin: 0 0 16px 0;

    @include themify() {
      color: themed('text-primary');
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 12px;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;

    @include themify() {
      background: themed('bg-card');
      border: 1px solid themed('border-color');
    }

    .info-label {
      @include themify() {
        color: themed('text-secondary');
      }
    }

    .info-value {
      font-weight: 500;

      @include themify() {
        color: themed('text-primary');
      }
    }
  }
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;

  @include themify() {
    color: themed('text-secondary');
  }

  p {
    font-size: 14px;
  }
}
</style>