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
    :is-open="patchModal.showPatchModal.value"
    :version="patches.currentVersion.value"
    :notes="patches.patchNotes.value"
    @close="patchModal.markPatchesAsSeen"
  />

  <div class="toast-container">
    <TransitionGroup name="toast">
      <Toast v-for="toast in toasts" :key="toast.id" :message="toast.message" :type="toast.type" />
    </TransitionGroup>
  </div>

  <UpdateToast />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useAppInit } from '@/composables/useAppInit'
import { usePatchModal } from '@/composables/usePatchModal'
import { useUpdateListener } from '@/composables/useUpdateListener'
import { initializeAppsStore } from '@/stores/apps'
import { usePatches } from '@/composables/usePatches'
import NavBar from '@/components/layout/NavBar.vue'
import MainView from '@/components/views/MainView.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import AppLoader from '@/components/common/AppLoader.vue'
import AppBar from '@/components/layout/AppBar.vue'
import StorageIndicator from '@/components/common/StorageIndicator.vue'
import Toast from '@/components/common/Toast.vue'
import PatchNotesModal from '@/components/common/PatchNotesModal.vue'
import UpdateToast from '@/components/common/UpdateToast.vue'

const { toasts } = useToast()
const patches = usePatches()
const patchModal = usePatchModal()
const { init } = useAppInit()

const currentTab = ref('apps')
const isLoading = ref(true)
const loaderRef = ref<InstanceType<typeof AppLoader>>()

onMounted(async () => {
  await init()
  await patchModal.checkPatches()
  initializeAppsStore()

  loaderRef.value?.finish()
  setTimeout(() => isLoading.value = false, 500)
})

useUpdateListener()
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