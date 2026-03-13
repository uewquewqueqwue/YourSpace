<script setup lang="ts">
import { ref, computed } from 'vue'
import EmailCard from './EmailCard.vue'
import type { EmailDTO } from '@/types/email'

interface Props {
  emails?: EmailDTO[]
  loading?: boolean
  rightPanel: boolean
}

interface Emits {
  (e: 'load-more'): void
  (e: 'email-click', email: EmailDTO): void
}

const props = withDefaults(defineProps<Props>(), {
  emails: () => [],
  loading: false
})

const emit = defineEmits<Emits>()

const scrollContainer = ref<HTMLElement | null>(null)

// Ensure emails is always an array
const safeEmails = computed(() => props.emails || [])

const handleScroll = () => {
  if (!scrollContainer.value || props.loading) return
  
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100
  
  if (scrolledToBottom) {
    emit('load-more')
  }
}

const handleEmailClick = (emailId: string) => {
  const email = safeEmails.value.find(e => e.id === emailId)
  if (email) {
    emit('email-click', email)
  }
}
</script>

<template>
  <div 
    ref="scrollContainer"
    class="email-list"
    @scroll="handleScroll"
  >
    <EmailCard
      v-for="(email, index) in safeEmails"
      :key="email.id"
      :email="email"
      :index="index"
      :rightPanel=rightPanel
      @toggle-read="handleEmailClick"
    />
    
    <div v-if="loading" class="loading-indicator">
      <span>Loading...</span>
    </div>
    
    <div v-if="!loading && safeEmails.length === 0" class="empty-state">
      <span>No emails found</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.email-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  height: 100%;
  padding: 16px 24px;


  &::-webkit-scrollbar {
    width: 6px;
  }

  @include themify() {
    &::-webkit-scrollbar-track {
      background: themed('brand-dark');
    }
    
    &::-webkit-scrollbar-thumb {
      background: themed("brand-primary");
      border-radius: 3px;

      &:hover {
        background: themed('text-secondary');
      }
    }
  }
}

.loading-indicator,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  
  @include themify() {
    color: themed('text-secondary');
  }
}
</style>
