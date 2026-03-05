<template>
  <div class="hint">
    <Zap color="#FB923C" class="hint-icon" /> Press Ctrl + K to search anything
  </div>
</template>

<script setup lang="ts">
import { Zap } from 'lucide-vue-next'
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto;
  font-size: 12px;
  padding: 8px;
  border-radius: 12px;
  width: 50%;

  @include themify() {
    color: themed('text-secondary');
    background: themed('bg-card');
  }

  &-icon {
    width: 20px;
  }
}
</style>