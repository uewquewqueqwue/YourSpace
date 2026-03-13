<template>
  <div class="inbox-view">
    <div class="inbox-header">
      <div class="filter-buttons">
        <button 
          @click="handleReadFilter(null)" 
          :class="{ active: showRead === null }"
          class="filter-btn"
        >
          All <span class="count">{{ total }}</span>
        </button>
        <button 
          @click="handleReadFilter(false)" 
          :class="{ active: showRead === false }"
          class="filter-btn"
        >
          Unread <span class="count">{{ unreadCount }}</span>
        </button>
        <button 
          @click="handleReadFilter(true)" 
          :class="{ active: showRead === true }"
          class="filter-btn"
        >
          Read <span class="count">{{ readCount }}</span>
        </button>
      </div>

      <div class="header-actions">
        <select v-model="selectedAccount" @change="handleAccountFilter" class="account-select">
          <option :value="null">All Accounts</option>
          <option v-for="account in accountOptions" :key="account.id" :value="account.id">
            {{ account.email }} ({{ account.count }})
          </option>
        </select>

        <input 
          v-model="searchQuery"
          @input="handleSearch"
          type="text"
          placeholder="Search emails..."
          class="search-input"
        />

        <button @click="handleSync" :disabled="syncing" class="btn-sync">
          <RefreshCw :size="16" :class="{ spinning: syncing }" />
        </button>

        <button @click="handleConnectAccount" class="btn-connect">
          <Plus :size="16" />
          Connect Account
        </button>
      </div>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div class="inbox-content">
      <div v-if="loading && !filteredEmails?.length" class="loading-state">
        <div class="spinner" />
        <p>Loading emails...</p>
      </div>

      <div v-else-if="filteredEmails.length === 0" class="empty-state">
        <Mail :size="48" :color="BRAND_COLOR + '40'" />
        <p>No emails found</p>
        <button v-if="accountOptions.length === 0" class="connect-btn" @click="handleConnectAccount">
          <Plus :size="14" />
          Connect your first account
        </button>
      </div>

      <EmailList
        v-else
        :emails="filteredEmails"
        :loading="loading"
        :right-panel="false"
        @load-more="handleLoadMore"
        @email-click="handleEmailClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, RefreshCw, Mail } from 'lucide-vue-next'
import { useEmailStore } from '@/stores/email.pinia'
import { storeToRefs } from 'pinia'
import EmailList from './EmailList.vue'

const BRAND_COLOR = '#8B5CF6'

const emailStore = useEmailStore()
const {
  filteredEmails,
  accountOptions,
  loading,
  syncing,
  error,
  selectedAccountId,
  showRead,
  searchQuery,
  total,
  hasMore
} = storeToRefs(emailStore)

const selectedAccount = ref<string | null>(null)

// Use store's unreadCount for accurate count
const { unreadCount: storeUnreadCount } = storeToRefs(emailStore)

const unreadCount = computed(() => {
  // If filtering by unread, show total from store
  if (showRead.value === false) {
    return total.value
  }
  // Otherwise show count from loaded emails
  return emailStore.emails.filter(e => !e.isRead).length
})

const readCount = computed(() => {
  // If filtering by read, show total from store
  if (showRead.value === true) {
    return total.value
  }
  // Otherwise show count from loaded emails
  return emailStore.emails.filter(e => e.isRead).length
})

onMounted(async () => {
  await emailStore.initialize()
})

const handleConnectAccount = async () => {
  try {
    await emailStore.connectAccount()
    // Reload accounts after OAuth flow completes
    // Note: This will update when the user completes OAuth in browser
    setTimeout(async () => {
      await emailStore.loadAccounts()
      await emailStore.loadEmails(0)
    }, 2000) // Give time for OAuth callback to complete
  } catch (err) {
    console.error('Failed to connect account:', err)
  }
}

const handleSync = async () => {
  try {
    await emailStore.triggerSync()
  } catch (err) {
    console.error('Sync failed:', err)
  }
}

const handleAccountFilter = () => {
  emailStore.setAccountFilter(selectedAccount.value)
}

const handleReadFilter = (value: boolean | null) => {
  emailStore.setReadFilter(value)
}

const handleSearch = () => {
  emailStore.searchEmails(searchQuery.value)
}

const handleLoadMore = () => {
  // Don't load more if already loading or no more emails
  if (loading.value || !hasMore.value) {
    return
  }
  
  const offset = filteredEmails.value.length
  emailStore.loadEmails(offset)
}

const handleEmailClick = async (email: any) => {
  try {
    await emailStore.markAsRead(email.id, !email.isRead)
  } catch (err) {
    console.error('Failed to update read status:', err)
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.inbox-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.inbox-header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid;

  @include themify() {
    border-color: themed('border-color');
  }

  .filter-buttons {
    display: flex;
    gap: 4px;

    .filter-btn {
      padding: 6px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      background: transparent;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s;

      @include themify() {
        color: themed('text-secondary');

        &:hover {
          background: themed('nav-bar-tab');
          color: themed('text-primary');
        }

        &.active {
          background: themed('brand-primary');
          color: white;

          .count {
            background: rgba(255, 255, 255, 0.2);
            color: white;
          }
        }
      }

      .count {
        font-size: 10px;
        padding: 2px 4px;
        border-radius: 4px;

        @include themify() {
          background: themed('bg-content');
          color: themed('text-secondary');
        }
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .account-select,
    .search-input {
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      border: 1px solid;
      transition: all 0.2s;

      @include themify() {
        background: themed('bg-card');
        color: themed('text-primary');
        border-color: themed('border-light-color');

        &:focus {
          outline: none;
          border-color: themed('brand-primary');
        }
      }
    }

    .account-select {
      min-width: 180px;
    }

    .search-input {
      min-width: 200px;
    }

    .btn-sync,
    .btn-connect {
      padding: 8px 12px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.2s;

      @include themify() {
        background: themed('nav-bar-tab');
        color: themed('text-secondary');

        &:hover {
          background: themed('brand-primary');
          color: themed('text-primary');
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }

    .btn-connect {
      @include themify() {
        background: themed('brand-primary');
        color: white;

        &:hover {
          opacity: 0.9;
          background: themed('brand-primary');
        }
      }
    }
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 12px 24px;
  margin: 16px 24px;
  border-radius: 8px;
  font-size: 13px;

  @include themify() {
    background: rgba(255, 0, 0, 0.1);
    color: themed('danger');
    border: 1px solid themed('danger') + '40';
  }
}

.inbox-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    gap: 16px;

    @include themify() {
      color: themed('text-secondary');
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;

      @include themify() {
        border-color: themed('brand-primary');
        border-top-color: transparent;
      }
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    gap: 16px;

    @include themify() {
      color: themed('text-secondary');

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .connect-btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      border: 1px solid;
      transition: all 0.3s ease;

      @include themify() {
        background: none;
        border-color: themed('border-light-color');
        color: themed('brand-primary');

        &:hover {
          border-color: themed('text-primary');
          color: themed('text-primary');
        }
      }
    }
  }
}
</style>