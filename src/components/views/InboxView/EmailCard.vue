<script setup lang="ts">
import type { EmailDTO } from '@/types/email'

interface Props {
  email: EmailDTO
  index?: number
  rightPanel: boolean
}

interface Emits {
  (e: 'toggle-read', emailId: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const formatTime = (timestamp: Date): string => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}m ago`
  } else if (hours < 24) {
    return `${hours}h ago`
  } else if (days < 7) {
    return `${days}d ago`
  } else {
    return timestamp.toLocaleDateString()
  }
}

const getSenderName = (sender: string): string => {
  // Extract name from "Name <email@example.com>" format
  const match = sender.match(/^(.+?)\s*</)
  return match ? match[1].trim() : sender
}

const getSenderInitial = (sender: string): string => {
  const name = getSenderName(sender)
  return name.charAt(0).toUpperCase()
}

const handleClick = (email: EmailDTO) => {
  emit('toggle-read', email.id)
}
</script>

<template>
  <div 
    class="email-card" 
    :class="{ read: email.isRead }"
    @click="handleClick(email)"
  >
    <div class="email-number" v-if="index !== undefined && !rightPanel">
      {{ index + 1 }}
    </div>
    
    <div class="indicator" v-if="!email.isRead"></div>
    
    <div class="avatar">
      <span>{{ getSenderInitial(email.sender) }}</span>
    </div>
    
    <div class="content">
      <div class="header">
        <span class="from">{{ getSenderName(email.sender) }}</span>
        <span class="time">{{ formatTime(email.timestamp) }}</span>
      </div>
      <div class="subject">{{ email.subject }}</div>
      <div class="preview">{{ email.preview }}</div>
      <div class="to-which">To: {{ email.recipient }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.email-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s;
  position: relative;
  
  @include themify() {
    background: themed('bg-card');
    
    &:hover {
      background: themed('brand-dark');
      transform: translateX(4px);
    }
  }

  &.read {
    opacity: 0.6;
  }
}

.email-number {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  
  @include themify() {
    // background: themed('text-secondary');
    color: themed('text-secondary');
  }
}

.indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  left: 8px;
  
  @include themify() {
    background: themed('brand-primary');
  }
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  
  @include themify() {
    background: themed('brand-dark');
    color: themed('brand-primary');
  }
}

.content {
  flex: 1;
  min-width: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;

  .from {
    font-size: 14px;
    font-weight: 500;
    @include themify() {
      color: themed('text-primary');
    }
  }

  .time {
    font-size: 12px;
    @include themify() {
      color: themed('text-secondary');
    }
  }
}

.subject {
  font-size: 13px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @include themify() {
    color: themed('text-primary');
  }
}

.preview, .to-which {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  @include themify() {
    color: themed('text-secondary');
  }
}

.preview {
  margin-bottom: 5px;
}

.to-which {
  text-decoration: underline;
}
</style>