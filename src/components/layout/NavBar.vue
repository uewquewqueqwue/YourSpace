<template>
  <nav class="navbar">
    <img src="/logo/logo.svg" alt="Logo" class="logo">

    <div class="nav-items">
      <div class="nav-item-wrapper">
        <div class="nav-item" :class="{ active: tab === 'apps' }" @click="setTab('apps')">
          <LayoutGrid />
        </div>
        <span class="tooltip">Apps</span>
      </div>

      <div class="nav-item-wrapper">
        <div class="nav-item" :class="{ active: tab === 'inbox' }" @click="setTab('inbox')">
          <Mailbox />
          <span class="badge" v-if="unreadCount">{{ unreadCount }}</span>
        </div>
        <span class="tooltip">Mails</span>
      </div>

      <div class="nav-item-wrapper">
        <div class="nav-item" :class="{ active: tab === 'todo' }" @click="setTab('todo')">
          <ListTodo />
          <span class="badge" v-if="activeTodoCount > 0">{{ activeTodoCount }}</span>
        </div>
        <span class="tooltip">Todo list</span>
      </div>

      <div class="nav-item-wrapper">
        <MusicPopup />
        <span class="tooltip">Now Playing</span>
      </div>

      <div class="nav-item-wrapper">
        <div class="nav-item" :class="{ active: tab === 'system' }" @click="setTab('system')">
          <Cpu />
        </div>
        <span class="tooltip">System stats</span>
      </div>
    </div>

    <div class="nav-bottom">
      <div class="nav-item-wrapper">
        <ProfilePopup />
        <span class="tooltip">Profile</span>
      </div>

      <div class="nav-item-wrapper">
        <div class="nav-item" :class="{ active: tab === 'settings' }" @click="setTab('settings')">
          <Settings :size="22" />
        </div>
        <span class="tooltip">Settings</span>
      </div>

      <div class="nav-item-wrapper" v-if="isDev">
        <div class="nav-item" :class="{ active: tab === 'media' }" @click="setTab('media')">
          <Image :size="22" />
        </div>
        <span class="tooltip">Media (Dev)</span>
      </div>

      <div class="nav-item-wrapper" v-if="isDev">
        <div class="nav-item" :class="{ active: tab === 'patch' }" @click="setTab('patch')">
          <FileDiff :size="22" />
        </div>
        <span class="tooltip">Patch (Dev)</span>
      </div>
    </div>

    <AuthModal />
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Mailbox, LayoutGrid, Image, Cpu, FileDiff, Settings, ListTodo } from 'lucide-vue-next'
import AuthModal from '@/components/common/auth/AuthModal.vue'
import ProfilePopup from '@/components/views/ProfileView/ProfilePopup.vue';
import MusicPopup from '@/components/views/MusicView/MusicPopup.vue';
import { useTodoStore } from '@/stores/todo.pinia'
import { useEmailStore } from '@/stores/email.pinia'

const props = defineProps<{
  tab: string
}>()

const emit = defineEmits(['update:tab'])
const isDev = import.meta.env.DEV

// Получаем количество активных задач
const todoStore = useTodoStore()
const activeTodoCount = computed(() => 
  todoStore.todos?.filter(t => !t.completed).length || 0
)

// Получаем количество непрочитанных писем
const emailStore = useEmailStore()
const unreadCount = computed(() => emailStore.unreadCount)

const setTab = (tab: string) => emit('update:tab', tab)
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.navbar {
  width: $nav-width;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  gap: 20px;
  border-right: 1px solid;
  isolation: isolate;
  border-bottom-left-radius: $radius-lg;

  @include themify() {
    background: themed('bg-nav');
    border-right-color: themed('border-color');
  }

  .logo {
    width: 35px;
    margin-bottom: 15px;
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: $radius-lg;
  }

  .nav-items {
    flex: 1;
  }

  .nav-bottom,
  .nav-items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .nav-item-wrapper {
    position: relative;
    display: flex;
    justify-content: center;

    &:hover .tooltip {
      opacity: 1;
      transform: translateX(0);
      pointer-events: none;
    }
  }

  .nav-item {
    position: relative;
    width: $nav-item-size;
    height: $nav-item-size;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $nav-border-radius;
    cursor: pointer;
    transition: 0.2s;

    @include themify() {
      color: themed('text-secondary');

      &:hover {
        background: themed('nav-bar-tab');
        color: themed('text-primary');
      }

      &.active {
        background: themed('nav-bar-tab');
        color: themed('text-primary');
      }
    }

    &.music {
      .now-playing {
        display: flex;
        gap: 2px;
        height: 16px;
        align-items: flex-end;

        .bar {
          width: 3px;
          border-radius: 1px;
          animation: bounce 1s infinite ease;

          @include themify() {
            background: themed('brand-primary');
          }

          &:nth-child(1) {
            height: 8px;
            animation-delay: 0s;
          }

          &:nth-child(2) {
            height: 12px;
            animation-delay: 0.2s;
          }

          &:nth-child(3) {
            height: 6px;
            animation-delay: 0.4s;
          }
        }
      }
    }

    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      color: white;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 8px;
      min-width: 16px;
      text-align: center;

      @include themify() {
        background: themed('brand-primary');
      }
    }
  }

  .tooltip {
    position: absolute;
    left: 110%;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    white-space: nowrap;
    border: 1px solid;
    opacity: 0;
    transform: translateX(-5px);
    transition: 0.2s;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

    @include themify() {
      background: themed('bg-card');
      color: themed('text-primary');
      border-color: themed('border-color');
    }

    &::before {
      content: '';
      position: absolute;
      left: -4px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      border-left: 1px solid;
      border-bottom: 1px solid;
      rotate: 45deg;

      @include themify() {
        background: themed('bg-card');
        border-color: themed('border-color');
      }
    }
  }
}

@keyframes bounce {
  0%, 100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}
</style>