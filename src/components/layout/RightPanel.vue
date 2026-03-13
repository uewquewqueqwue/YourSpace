<script setup lang="ts">
import { computed } from 'vue'
import { useEmailStore } from '@/stores/email.pinia'
import { storeToRefs } from 'pinia'
import EmailList from "@/components/views/InboxView/EmailList.vue"

const emailStore = useEmailStore()
const { recentEmails, loading } = storeToRefs(emailStore)

// Safe emails for EmailList component
const safeEmails = computed(() => recentEmails.value || [])
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>New Emails</h2>
    </div>
    <div class="sidebar-content">
      <div v-if="loading && !safeEmails.length" class="loading-state">
        <div class="spinner" />
      </div>
      <div v-else-if="safeEmails.length === 0" class="empty-state">
        <p>No emails yet</p>
      </div>
      <EmailList 
        v-else
        :emails="safeEmails"
        :loading="false"
        :right-panel="true"
        @email-click="(email) => emailStore.markAsRead(email.id, !email.isRead)"
      />
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

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    
    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 12px;
      
      @include themify() {
        color: themed('text-secondary');
      }
      
      p {
        font-size: 14px;
      }
    }
    
    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      
      @include themify() {
        border-color: themed('border-color');
        border-top-color: themed('brand-primary');
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>