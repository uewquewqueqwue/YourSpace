<template>
  <div class="settings-view">
    <button v-if="hasChanges" class="save-btn" @click="saveSettings" :disabled="isSaving">
      <Save :size="16" />
      {{ isSaving ? 'Saving...' : 'Save changes' }}
    </button>

    <div class="settings-container">
      <div class="settings-nav">
        <div v-for="section in [
          { id: 'appearance', icon: Palette, label: 'Appearance' },
          { id: 'notifications', icon: Bell, label: 'Notifications' },
          { id: 'privacy', icon: Lock, label: 'Privacy' },
          { id: 'system', icon: Monitor, label: 'System' },
          { id: 'account', icon: User, label: 'Account' }
        ]" :key="section.id" class="nav-item" :class="{ active: activeSection === section.id }"
          @click="activeSection = section.id">
          <component :is="section.icon" :size="18" />
          <span>{{ section.label }}</span>
          <ChevronRight :size="16" class="arrow" />
        </div>
      </div>

      <div class="settings-content">
        <!-- Appearance -->
        <div v-if="activeSection === 'appearance'" class="settings-section">
          <h2>Appearance</h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <h3>Theme</h3>
                <p>Choose your preferred theme</p>
              </div>
              <div class="theme-selector">
                <button class="theme-btn" :class="{ active: settings.appearance.theme === 'light' }"
                  @click="settings.appearance.theme = 'light'">
                  <Sun :size="20" />
                  Light
                </button>
                <button class="theme-btn" :class="{ active: settings.appearance.theme === 'dark' }"
                  @click="settings.appearance.theme = 'dark'">
                  <Moon :size="20" />
                  Dark
                </button>
                <button class="theme-btn" :class="{ active: settings.appearance.theme === 'system' }"
                  @click="settings.appearance.theme = 'system'">
                  <Monitor :size="20" />
                  System
                </button>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <h3>Animations</h3>
                <p>Enable interface animations</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.appearance.animations">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div v-else-if="activeSection === 'notifications'" class="settings-section">
          <h2>Notifications</h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <h3>Email Notifications</h3>
                <p>Receive email updates</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.notifications.email">
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div v-else-if="activeSection === 'account'" class="settings-section">
          <h2>Account</h2>

          <template v-if="auth.user.value">
            <div class="profile-card">
              <div class="profile-header">
                <div class="avatar">
                  <img v-if="auth.user.value.avatar" :src="auth.user.value.avatar" alt="">
                  <User v-else :size="32" />
                </div>
                <div class="profile-info">
                  <h3>{{ auth.user.value.name || 'User' }}</h3>
                  <p>{{ auth.user.value.email }}</p>
                </div>
              </div>
            </div>

            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <h3>Two-Factor Authentication</h3>
                  <p>Add extra security to your account</p>
                </div>
                <label class="switch">
                  <input type="checkbox" v-model="settings.privacy.twoFactorAuth">
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
            <button class="danger-btn" @click="handleLogout">
              <LogOut :size="16" />
              Sign Out
            </button>
          </template>

          <template v-else>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <h3>You are not logged in to your profile</h3>
                  <p>First you need to log in to your account</p>
                </div>
              </div>
            </div>
            <button class="info-btn" @click.stop="auth.openLogin">
              <LogIn :size="16" />
              Login
            </button>
          </template>

        </div>

        <div v-else-if="activeSection === 'system'" class="settings-section">
          <h2>System</h2>

          <div class="setting-group">
            <div class="setting-item">
              <div class="setting-info">
                <h3>Check for Updates</h3>
                <p>Manually check if new version is available</p>
              </div>
              <button class="update-btn" @click="checkForUpdates" :disabled="isChecking">
                <RefreshCw :size="16" :class="{ spinning: isChecking }" />
                {{ isChecking ? 'Checking...' : 'Check' }}
              </button>
            </div>

            <div class="setting-item" v-if="updateInfo">
              <div class="setting-info">
                <h3>Update Available v{{ updateInfo.version }}</h3>
                <p>New version is ready to download</p>
                <div v-if="isDownloading" class="download-progress">
                  <div class="progress-bar" :style="{ width: downloadProgress + '%' }" />
                  <span>{{ Math.round(downloadProgress) }}%</span>
                </div>
              </div>
              <button class="download-btn" @click="startDownload" :disabled="isDownloading">
                <Download :size="16" />
                {{ isDownloading ? 'Downloading...' : 'Download Now' }}
              </button>
            </div>

            <div class="setting-item" v-else>
              <div class="setting-info">
                <h3>Current Version</h3>
                <p>You are using version {{ currentVersion }}</p>
              </div>
              <div class="version-badge">{{ currentVersion }}</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import {
  User, Bell, Moon, Sun, Lock, Palette,
  Monitor, LogOut, LogIn, RefreshCw,
  ChevronRight, Save, Download
} from 'lucide-vue-next'
import { useAuth } from '@/stores/auth'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import { version } from '../../../../package.json'

const { settings } = useSettings()
const isSaving = ref(false)
const activeSection = ref('appearance')
const auth = useAuth()
const toast = useToast()

const currentVersion = ref(version)
const isChecking = ref(false)
const isDownloading = ref(false)
const updateInfo = ref<any>(null)
const downloadProgress = ref(0)

const originalSettings = ref(JSON.parse(JSON.stringify(settings.value)))
const hasChanges = ref(false)

watch(settings, () => {
  hasChanges.value = JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value)
}, { deep: true })

const saveSettings = async () => {
  isSaving.value = true
  await new Promise(r => setTimeout(r, 500))

  originalSettings.value = JSON.parse(JSON.stringify(settings.value))
  hasChanges.value = false

  toast.success("Settings saved successfully")
  isSaving.value = false
}

const checkForUpdates = () => {
  isChecking.value = true
  window.electronAPI?.updater.checkForUpdates()
  setTimeout(() => isChecking.value = false, 2000)
}

const startDownload = () => {
  isDownloading.value = true
  window.electronAPI?.updater.downloadUpdate()
}

const onProgress = (progress: any) => {
  downloadProgress.value = progress.percent
  if (progress.percent >= 100) {
    setTimeout(() => {
      isDownloading.value = false
      downloadProgress.value = 0
    }, 1000)
  }
}
const handleLogout = () => {
  auth.logout()
  toast.success('Logged out successfully')
}

onMounted(() => {
  window.electronAPI?.updater.onUpdateAvailable((info) => {
    updateInfo.value = info
  })
  
  window.electronAPI?.updater.onUpdateNotAvailable(() => {
    updateInfo.value = null
  })
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;

  @include themify() {
    background: themed('bg-content');
  }
}

.header {
  padding-bottom: 24px;
  border-bottom: 1px solid;
  display: flex;
  justify-content: space-between;
  align-items: center;

  @include themify() {
    border-bottom-color: themed('border-color');

    h1 {
      font-size: 20px;
      font-weight: 500;
      color: themed('text-primary');
    }
  }
}

.save-btn {
    position: fixed;
    bottom: 30px;
    right: 430px;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 13px;

    @include themify() {
      background: themed('brand-primary');
      color: white;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

.settings-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.update-btn,
.download-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.update-btn {
  @include themify() {
    background: themed('bg-content');
    color: themed('text-primary');
    border: 1px solid themed('border-color');

    &:hover:not(:disabled) {
      border-color: themed('brand-primary');
    }
  }
}

.download-btn {
  @include themify() {
    background: themed('brand-primary');
    color: white;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }
  }
}

.update-btn:disabled,
.download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.download-progress {
  margin-top: 8px;
  height: 4px;
  width: 200px;
  background: #333;
  border-radius: 2px;
  position: relative;
}

.progress-bar {
  height: 100%;

  @include themify() {
    background: themed("brand-primary");
  }

  border-radius: 2px;
  transition: width .3s ease;
}

.download-progress span {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 11px;
  color: #aaa;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.version-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  @include themify() {
    background: themed('bg-content');
    color: themed('text-secondary');
    border: 1px solid themed('border-color');
  }
}

.settings-nav {
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-right: 1px solid;
  padding: 16px 8px;

  @include themify() {
    background: themed('bg-content');
    border-right-color: themed('border-color');
  }

  .nav-item {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: .2s;
    border-radius: 9px;

    @include themify() {
      color: themed('text-secondary');

      &:hover {
        background: themed('nav-bar-tab');
        color: themed('text-primary');
      }

      &.active {
        background: themed('nav-bar-tab');
        color: white;
      }
    }

    .arrow {
      margin-left: auto;
      opacity: 0.5;
    }
  }
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.settings-section {
  h2 {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 24px;

    @include themify() {
      color: themed('text-primary');
    }
  }
}

.setting-group {
  border-radius: $radius-lg;
  border: 1px solid;
  overflow: hidden;

  @include themify() {
    background: themed('bg-card');
    border-color: themed('border-color');
  }
}

.setting-item {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid;

  @include themify() {
    border-bottom-color: themed('border-light-color');
  }

  &:last-child {
    border-bottom: none;
  }

  .setting-info {
    h3 {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;

      @include themify() {
        color: themed('text-primary');
      }
    }

    p {
      font-size: 12px;

      @include themify() {
        color: themed('text-secondary');
      }
    }
  }
}

.theme-selector {
  display: flex;
  gap: 8px;

  .theme-btn {
    padding: 8px 12px;
    border: 1px solid;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;

    @include themify() {
      background: themed('bg-nav');
      border-color: themed('border-color');
      color: themed('text-secondary');

      &.active {
        background: themed('brand-primary');
        color: white;
        border-color: themed('brand-primary');
      }
    }
  }
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .switch-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    transition: 0.2s;
    border-radius: 24px;

    @include themify() {
      background-color: themed('brand-dark');
    }

    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }
  }

  input:checked+.switch-slider {
    @include themify() {
      background-color: themed('brand-primary');
    }
  }

  input:checked+.switch-slider:before {
    transform: translateX(20px);
  }
}

.profile-card {
  border-radius: $radius-lg;
  border: 1px solid;
  padding: 20px;
  margin-bottom: 24px;

  @include themify() {
    background: themed('bg-card');
    border-color: themed('border-color');
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 16px;

    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;

      & img {
        width: 64px;
        height: 64px;
        border-radius: $radius-lg;
        object-fit: cover;
      }
    }
  }
}

.danger-btn {
  width: 100%;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 8px;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
}

.info-btn {
  width: 100%;
  padding: 12px;
  background: rgba(68, 142, 239, 0.1);
  border: 1px solid rgba(68, 171, 239, 0.2);
  border-radius: 8px;
  color: #44a2ef;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  margin-top: 8px;

  &:hover {
    background: rgba(68, 176, 239, 0.2);
  }
}
</style>