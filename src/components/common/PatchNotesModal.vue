<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal">
        <div class="header">
          <div class="version-badge">v{{ version }}</div>
          <h2>What's New</h2>
          <button class="close-btn" @click="close">
            <X :size="18" />
          </button>
        </div>

        <div class="content">
          <div v-for="(note, index) in notes" :key="index" class="note-item">
            <div class="note-header">
              <span class="note-icon-wrapper" :class="getCategoryColor(note.category)">
                <div class="note-icon">{{ note.icon }}</div>
              </span>
              <span class="note-text">{{ note.title }}</span>
            </div>
            <div v-if="note?.desc" class="note-description markdown-body" v-html="renderMarkdown(note.desc)" />
            <span v-if="note.category" class="note-category">{{ note.category }}</span>
          </div>
        </div>

        <div class="footer">
          <button class="primary-btn" @click="close">
            Got it
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { marked } from 'marked';

const props = defineProps<{
  modelValue: boolean
  version: string
  notes: Array<{ icon: string; title: string; desc?: string, category: string }>
}>()

const emit = defineEmits(['update:modelValue', 'seen'])

const close = () => {
  emit('update:modelValue', false)
  emit('seen')
}

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
  width: 520px;
  border-radius: 16px;
  overflow: hidden;

  @include themify() {
    background: themed('bg-card');
    border: 1px solid themed('border-color');
  }
}

.header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid;

  @include themify() {
    border-bottom-color: themed('border-color');

    h2 {
      color: themed('text-primary');
      font-size: 18px;
    }

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

  .close-btn {
    background: none;
    border: none;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;

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
  padding: 20px;
  width: 520px;
  max-height: 70vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;

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

.note-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: 8px;

  @include themify() {
    background: themed('bg-nav');
  }

  .note-header {
    display: flex;
    align-items: center;
    gap: 10px
  }

  .note-icon {
    font-size: 20px;

    &-wrapper {
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
    }
  }

  .note-text {
    color: themed('text-primary');
    font-size: 14px;
    font-weight: 500;
  }

  .note-description {
    font-size: 13px;
    line-height: 1.5;

    @include themify() {
      color: themed('text-secondary');
    }

    :deep(ul),
    :deep(ol) {
      margin: 8px 0;
      padding-left: 20px;
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

.footer {
  padding: 20px;
  border-top: 1px solid;

  @include themify() {
    border-top-color: themed('border-color');
  }

  .primary-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    cursor: pointer;

    @include themify() {
      background: themed('brand-primary');
      color: white;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}
</style>