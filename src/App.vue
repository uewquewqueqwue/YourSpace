<template>
  <AppLoader v-if="isLoading" ref="loaderRef" />

  <div v-else class="app">
    <AppBar :tab="currentTab" />

    <div class="content">
      <NavBar :tab="currentTab" @update:tab="currentTab = $event" />
      <MainView :tab="currentTab" />
      <RightPanel />

      <StorageIndicator />
    </div>
  </div>

  <PatchNotesModal
    :is-open="showPatchModal"
    :version="patches.currentVersion.value"
    :notes="patches.patchNotes.value"
    @close="markPatchesAsSeen"
  />

  <div class="toast-container">
    <TransitionGroup name="toast">
      <Toast v-for="toast in toasts" :key="toast.id" :message="toast.message" :type="toast.type" />
    </TransitionGroup>
  </div>

  <UpdateToast />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/stores/auth'
import { useAppsStore, initializeAppsStore } from '@/stores/apps'
import { usePatches } from '@/composables/usePatches'
import { useSettings } from '@/composables/useSettings'
import { useToast } from '@/composables/useToast'
import NavBar from '@/components/layout/NavBar.vue'
import MainView from '@/components/views/MainView.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import AppLoader from '@/components/common/AppLoader.vue'
import AppBar from '@/components/layout/AppBar.vue'
import StorageIndicator from '@/components/common/StorageIndicator.vue'
import Toast from '@/components/common/Toast.vue'
import PatchNotesModal from '@/components/common/PatchNotesModal.vue'
import UpdateToast from '@/components/common/UpdateToast.vue'
import { useVersionStore } from '@/stores/version'
import packageJson from '../package.json'

const auth = useAuth()
const appsStore = useAppsStore()
const patches = usePatches()
const currentTab = ref('apps')
const isLoading = ref(true)
const loaderRef = ref<InstanceType<typeof AppLoader>>()
const { toasts } = useToast()
const { applyAll } = useSettings()
const versionStore = useVersionStore()


const PATCH_SEEN_KEY = 'patch_seen_version'
const showPatchModal = ref(false)

versionStore.setAppVersion(packageJson.version)

const checkPatches = async () => {
  await patches.fetchPatches()
  versionStore.setVersion(patches.currentVersion.value)
  
  const lastSeen = localStorage.getItem(PATCH_SEEN_KEY)
  
  if (patches.currentVersion.value === packageJson.version && 
      lastSeen !== patches.currentVersion.value) {
    showPatchModal.value = true
  }
}

const markPatchesAsSeen = () => {
  localStorage.setItem(PATCH_SEEN_KEY, patches.currentVersion.value)
  showPatchModal.value = false
}

onMounted(async () => {
  applyAll()

  await new Promise(resolve => setTimeout(resolve, 1500))

  await auth.checkAuth()
  await checkPatches()

  if (auth.user.value) {
    appsStore.startPeriodicSync()
  }

  loaderRef.value?.finish()

  setTimeout(() => {
    window.electronAPI?.expandWindow()
  }, 100)

  setTimeout(() => {
    isLoading.value = false
  }, 500)

  window.electronAPI?.onAppClosing(async () => {
    console.log('App closing, syncing...')
    const token = localStorage.getItem('token')
    
    if (auth.user.value && token) {
      await appsStore.forceSync(token)
    } else {
      appsStore.saveToStorage()
    }
  })

  window.addEventListener('open-patch-notes', () => {
    showPatchModal.value = true
  })

  initializeAppsStore()
})

onUnmounted(() => {
  window.removeEventListener('open-patch-notes', () => {})
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
  background: transparent !important;
  border-radius: 16px;
}

#app {
  height: 100vh;
  border-radius: 16px;
  overflow: hidden;
  background: transparent;
}
</style>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  border-radius: 16px;
  overflow: hidden;

  @include themify() {
    background: themed("bg-nav");
    color: themed("text-primary");
  }
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
  border-radius: 16px;
}

button:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 2px solid #8B5CF6 !important;
  outline-offset: 2px;
}
</style>