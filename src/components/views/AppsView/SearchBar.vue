<template>
  <div class="search-bar" @click="openSearch">
    <Search :size="16" />
    <span>Quick search...</span>
    <span class="shortcut">Ctrl + K</span>
  </div>
</template>

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { useSearch } from '@/composables/useSearch'
import { log } from '@/log/logger'

const { openSearch } = useSearch()
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.search-bar {
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid;
  margin-bottom: 20px;
  cursor: pointer;
  transition: 0.2s;
  width: 100%;
  pointer-events: auto;

  @include themify() {
    background: themed('bg-card');
    color: themed('text-secondary');
    border-color: themed('border-color');
    
    &:hover {
      border-color: themed('brand-primary');
    }
  }

  .shortcut {
    margin-left: auto;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;

    @include themify() {
      background: themed('brand-dark');
      color: themed('text-secondary');
    }
  }
}
</style>