<script setup lang="ts">
defineProps<{
  from: string
  subject: string
  preview: string
  to_which: string
  time: string
  read?: boolean
  important?: boolean
  avatar?: string
}>()
</script>

<template>
  <div class="email-card" :class="{ read, important }">
    <div class="indicator" v-if="!read"></div>
    
    <div class="avatar">
      <span>{{ avatar || from.charAt(0).toUpperCase() }}</span>
    </div>
    
    <div class="content">
      <div class="header">
        <span class="from">{{ from }}</span>
        <span class="time">{{ time }}</span>
      </div>
      <div class="subject">{{ subject }}</div>
      <div class="preview">{{ preview }}</div>
      <div class="to-which">{{ to_which }}</div>
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

  &.important {
    @include themify() {
      border-left: 3px solid themed('brand-primary');
    }
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