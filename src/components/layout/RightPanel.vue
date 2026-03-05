<script setup lang="ts">
import EmailList from "@/components/views/InboxView/EmailList.vue"
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>New Emails</h2>
    </div>
    <div class="sidebar-content">
      <EmailList />
    </div>
  </aside>
</template>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.sidebar {
  width: $sidebar-width;
  display: flex;
  flex-direction: column;
  border-bottom-right-radius: $radius-lg;
  
  @include themify() {
    background: themed('bg-sidebar');
  }

  .sidebar-header {
    padding: 20px;
    border-bottom: 1px solid;
    display: flex;
    justify-content: center;
    align-items: center;
    
    @include themify() {
      border-bottom-color: themed('border-color');
      
      h2 {
        font-size: 16px;
        font-weight: 400;
        color: themed('text-primary');
      }
    }
  }
}
</style>