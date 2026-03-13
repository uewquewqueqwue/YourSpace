<template>
  <AppLoader v-if="isLoading" ref="loaderRef" />

  <div v-else class="app">
    <AppBar :tab="currentTab" @open-patches="showPatchModal = true" />

    <div class="content">
      <NavBar :tab="currentTab" @update:tab="currentTab = $event" />
      <MainView :tab="currentTab" />
      <RightPanel />
      <StorageIndicator />
    </div>
  </div>

  <PatchNotesModal v-model="showPatchModal" :version="patches.currentVersion.value" :notes="patches.patchNotes.value"
    @seen="markPatchesAsSeen" />

  <div class="toast-container">
    <TransitionGroup name="toast">
      <Toast v-for="toast in toasts" :key="toast.id" :message="toast.message" :type="toast.type" />
    </TransitionGroup>
  </div>

  <UpdateToast />
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { usePatches } from '@/composables/usePatches'
import { useSettings } from '@/composables/useSettings'
import { useAuthStore } from '@/stores/auth.pinia'
import { useAppsStore } from '@/stores/apps.pinia'
import { useTodoStore } from '@/stores/todo.pinia'
import NavBar from '@/components/layout/NavBar.vue'
import MainView from '@/components/views/MainView.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import AppLoader from '@/components/common/AppLoader.vue'
import AppBar from '@/components/layout/AppBar.vue'
import StorageIndicator from '@/components/common/StorageIndicator.vue'
import Toast from '@/components/common/Toast.vue'
import PatchNotesModal from '@/components/common/PatchNotesModal.vue'
import UpdateToast from '@/components/common/UpdateToast.vue'
import { useDeadlineNotifications } from './composables/useDeadlineNotifications'

const { toasts } = useToast()
const patches = usePatches()
const { applyAll } = useSettings()
const authStore = useAuthStore()
const appsStore = useAppsStore()
const todoStore = useTodoStore()

const deadlineNotifications = useDeadlineNotifications()

const currentTab = ref('apps')
const isLoading = ref(true)
const loaderRef = ref<InstanceType<typeof AppLoader>>()
const showPatchModal = ref(false)

const currentVersion = computed(() => patches.currentVersion.value)
const PATCH_SEEN_KEY = 'patch_seen_key'

const checkPatches = async () => {
  await patches.fetchPatches()

  const lastSeen = localStorage.getItem(PATCH_SEEN_KEY)
  if (lastSeen !== currentVersion.value) {
    showPatchModal.value = true
  }
}

const markPatchesAsSeen = () => {
  localStorage.setItem(PATCH_SEEN_KEY, currentVersion.value)
}

onMounted(async () => {
  applyAll()

  await authStore.checkAuth()

  await appsStore.initialize()
  await todoStore.initialize()

  loaderRef.value?.finish()
  setTimeout(() => {
    isLoading.value = false
    window.electronAPI?.window.expandWindow()

    setTimeout(async () => {
      await checkPatches()
      // Start deadline checking after window is expanded
      deadlineNotifications.startChecking()
    }, 200)
  }, 500)

  window.electronAPI?.window.onAppClosing(async () => {
    const token = localStorage.getItem('token')
    if (authStore.user && token) {
      await appsStore.forceSync(token)
      await todoStore.forceSync(token)
    } else {
      appsStore.saveToStorage()
      todoStore.saveToStorage()
    }
    
    deadlineNotifications.stopChecking()
    appsStore.cleanup()
    todoStore.cleanup()
  })
})

onUnmounted(() => {
  deadlineNotifications.stopChecking()
  appsStore.cleanup()
  todoStore.cleanup()
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

*:focus {
  outline: none !important;
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

.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000001;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>