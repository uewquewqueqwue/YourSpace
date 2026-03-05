<template>
  <div class="tab-placeholder">
    <Inbox :size="48" />
    <h2>Inbox</h2>
    <p>Your emails will appear here</p>
  </div>
</template>

<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.tab-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  opacity: 0.5;

  @include themify() {
    color: themed('text-secondary');
  }

  h2 {
    font-size: 24px;
    font-weight: 500;
  }

  p {
    font-size: 14px;
  }
}
</style>