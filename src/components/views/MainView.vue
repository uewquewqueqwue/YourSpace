<template>
  <main class="main-view">
    <AppsView v-show="tab === 'apps'" :tab="tab" />
    <InboxView v-show="tab === 'inbox'" />
    <TodoView v-show="tab === 'todo'" />
    <SystemView v-show="tab === 'system'" />
    <SettingsView v-show="tab === 'settings'" />
    <MediaView v-show="tab === 'media'" />
    <PatchEditorView v-show="tab === 'patch'" />
  </main>
</template>

<script setup lang="ts">
import AppsView from '@/components/views/AppsView/AppsView.vue'
import InboxView from '@/components/views/InboxView/InboxView.vue'
import TodoView from '@/components/views/TodoView/TodoView.vue'
import SystemView from '@/components/views/SystemView/SystemView.vue'
import SettingsView from '@/components/views/SettingsView/SettingsView.vue'
import MediaView from '@/components/views/AdminView/MediaView.vue'
import PatchEditorView from '@/components/views/AdminView/AdminPatchEditor.vue'

defineProps<{ tab: string }>()
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.main-view {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid;

  @include themify() {
    background: themed('bg-content');
    border-right-color: themed('border-color');
  }
}
</style>