<template>
  <Teleport to="body">
    <div v-if="modal.isOpen.value" class="modal-overlay" ref="modal.overlayRef">
      <div class="modal" ref="modal.modalRef">
        <div class="header">
          <div class="header-left">
            <div class="version-badge">v{{ version }}</div>
            <h2>What's new?</h2>
          </div>
          <button class="close-btn" @click="modal.close">
            <X :size="18" />
          </button>
        </div>

        <div class="content">
          <div v-if="notes && notes.length" class="notes-list">
            <div v-for="(note, index) in notes" :key="index" class="note-item">
              <div class="note-icon-wrapper" :class="getCategoryColor(note.category)">
                <span class="note-icon">{{ note.icon }}</span>
              </div>
              <div class="note-content">
                <span class="note-title">{{ note.title }}</span>
                <div v-if="note?.desc" class="note-description markdown-body" v-html="renderMarkdown(note.desc)" />
                <span v-if="note?.category" class="note-category">{{ note.category }}</span>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <p>No updates available</p>
          </div>
        </div>

        <div class="footer">
          <button class="primary-btn" @click="modal.close">
            Got it
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useModal } from '@/composables/useModal'
import { marked } from 'marked'

const props = defineProps<{
  isOpen: boolean
  version: string
  notes: Array<{ icon: string; title: string; desc: string; category: string }>
}>()

const emit = defineEmits(['close'])

const modal = useModal({
  onClose: () => emit('close'),
  closeOnClickOutside: true,
  closeOnEscape: true,
  initialOpen: props.isOpen
})

const getCategoryColor = (category?: string) => {
  const colorMap = {
    FEATURE: 'feature',
    IMPROVEMENT: 'improvement',
    BUGFIX: 'bugfix',
    PERFORMANCE: 'performance'
  }
  return colorMap[category as keyof typeof colorMap] || ''
}

const renderMarkdown = (text: string) => {
  if (!text) return ''
  try {
    return marked(text)
  } catch (e) {
    return text
  }
}

watch(() => props.isOpen, (val) => {
  if (val) modal.open()
  else modal.close()
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, .7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000000;
}

.modal {
  width: 550px;
  max-width: 90vw;
  border-radius: $radius-lg;
  overflow: hidden;
  padding-right: 5px;
  animation: modalSlide .6s ease;

  @include themify() {
    background: themed('bg-card');
  }
}

@keyframes modalSlide {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid;

  @include themify() {
    border-bottom-color: themed('border-light-color');

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .version-badge {
        padding: 6px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;

        background: themed('brand-primary');
        color: white;
      }

      h2 {
        color: themed('text-primary');
        font-size: 18px;
        font-weight: 600;
      }
    }
  }

  .close-btn {
    background: none;
    border: none;
    padding: 8px;
    border-radius: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: .2s;

    @include themify() {
      color: themed('text-secondary');

      &:hover {
        background: themed('border-color');
        color: themed('text-primary');
      }
    }
  }
}

.content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;

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

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-radius: 16px;
  transition: 0.2s;

  @include themify() {
    background: themed('bg-nav');

    &:hover {
      background: themed('border-light-color');
    }
  }

  .note-icon-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    @include themify() {
      &.feature {
        background: linear-gradient(135deg, themed('brand-primary') 0%, themed('brand-dark') 100%);
      }

      &.improvement {
        background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%);
      }

      &.bugfix {
        background: linear-gradient(135deg, #EF4444 0%, #991B1B 100%);
      }

      &.performance {
        background: linear-gradient(135deg, #10B981 0%, #065F46 100%);
      }
    }

    .note-icon {
      font-size: 20px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    }
  }

  .note-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;

    .note-title {
      font-size: 15px;
      font-weight: 600;

      @include themify() {
        color: themed('text-primary');
      }
    }

    .note-description {
      font-size: 13px;
      line-height: 1.5;

      @include themify() {
        color: themed('text-secondary');
      }
    }

    .note-category {
      align-self: flex-start;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      @include themify() {
        background: themed('border-color');
        color: themed('text-secondary');
      }
    }
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;

  @include themify() {
    color: themed('text-secondary');
    font-size: 14px;
  }
}

.footer {
  padding: 20px 24px;
  border-top: 1px solid;

  @include themify() {
    border-top-color: themed('border-light-color');
  }

  .primary-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: .2s;

    @include themify() {
      background: themed('brand-primary');
      color: white;

      &:hover {
        opacity: .9;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}
</style>