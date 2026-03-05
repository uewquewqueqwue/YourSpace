<template>
  <div class="apps-view">
    <SearchBar />
    
    <div class="content" ref="contentRef" :style="contentStyle">
      <TrackedSection @add="showAddModal = true" />
      <QuickLaunchSection />
    </div>
    
    <SearchHint />
    
    <AddAppModal v-model="showAddModal" />
    <SearchModal />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import SearchBar from '@/components/views/AppsView/SearchBar.vue'
import TrackedSection from '@/components/views/AppsView/TrackedSection.vue'
import QuickLaunchSection from '@/components/views/AppsView/QuickLaunchSection.vue'
import AddAppModal from '@/components/views/AppsView/modals/AddAppModal.vue'
import SearchHint from './SearchHint.vue'
import SearchModal from './modals/SearchModal.vue'
import { useAppsStore } from '@/stores/apps'
import { useSearch } from '@/composables/useSearch'

const showAddModal = ref(false)
const store = useAppsStore()
const { openSearch } = useSearch()
const contentRef = ref<HTMLElement | null>(null)
const hasScrollbar = ref(false)

const props = defineProps<{
  tab: string
}>()

const checkScrollbar = () => {
  if (contentRef.value) {
    hasScrollbar.value = contentRef.value.scrollHeight > contentRef.value.clientHeight
  }
}

const contentStyle = computed(() => ({
  paddingRight: hasScrollbar.value ? '16px' : '0px'
}))

const handler = (e: KeyboardEvent) => {
  if (props.tab === "apps" && e.ctrlKey && e.key === 'k') {
    e.preventDefault()
    openSearch()
  }
}

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (token) {
    await store.fetchApps(token)
  }
  
  window.addEventListener('keydown', handler)

  checkScrollbar()
  window.addEventListener('resize', checkScrollbar)

  if (contentRef.value) {
    const observer = new ResizeObserver(checkScrollbar)
    observer.observe(contentRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handler)
  window.removeEventListener('resize', checkScrollbar)
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.apps-view {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 24px;

  @include themify() {
    background: themed('bg-content');
  }
}

.content {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 20px;
  transition: padding-right .3s;
    
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  @include themify() {
    &::-webkit-scrollbar-track {
      background: themed("brand-dark");
    }
  
    &::-webkit-scrollbar-thumb {
      background: themed('brand-primary');
      border-radius: 3px;
      
      &:hover {
        background: themed('text-secondary');
      }
    }
  }
}
</style>