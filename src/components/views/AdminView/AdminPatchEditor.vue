<template>
  <div class="admin-patch-editor">
    <div class="editor-header">
      <h2>Patch Notes Editor</h2>
      <div class="header-actions">
        <button class="preview-btn" @click="showPreview = !showPreview">
          <Eye :size="16" />
          {{ showPreview ? 'Hide' : 'Show' }} Preview
        </button>
        <button class="save-btn" @click="saveVersion" :disabled="saving">
          <Save :size="16" />
          {{ saving ? 'Saving...' : 'Save Version' }}
        </button>
      </div>
    </div>

    <div class="editor-content" :class="{ 'with-preview': showPreview }">
      <div class="editor-panel">
        <div class="version-input">
          <label>Version</label>
          <input 
            v-model="currentVersion" 
            type="text" 
            placeholder="e.g. 1.0.1"
            class="version-field"
          />
        </div>

        <div class="patches-list">
          <div v-for="(patch, index) in patches" :key="index" class="patch-item">
            <div class="patch-header">
              <span class="patch-number">#{{ index + 1 }}</span>
              <button class="remove-patch" @click="removePatch(index)" title="Remove">
                <Trash2 :size="14" />
              </button>
            </div>
            
            <div class="patch-fields">
              <div class="field-row">
                <div class="field icon-field">
                  <label>Icon</label>
                  <input v-model="patch.icon" placeholder="✨" maxlength="2" />
                </div>
                <div class="field category-field">
                  <label>Category</label>
                  <select v-model="patch.category">
                    <option value="feature">Feature</option>
                    <option value="improvement">Improvement</option>
                    <option value="bugfix">Bugfix</option>
                    <option value="performance">Performance</option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label>Title</label>
                <input v-model="patch.title" placeholder="Short title" />
              </div>

              <div class="field">
                <label>Description (Markdown)</label>
                <textarea 
                  v-model="patch.description" 
                  placeholder="# Heading\n- list item\n**bold** etc..."
                  rows="4"
                />
              </div>
            </div>
          </div>

          <button class="add-patch-btn" @click="addPatch">
            <Plus :size="16" />
            Add Patch Note
          </button>
        </div>
      </div>

      <!-- Правая панель - превью -->
      <div v-if="showPreview" class="preview-panel">
        <h3>Preview</h3>
        <div class="preview-modal">
          <div class="modal-header">
            <div class="version-badge">v{{ currentVersion || '1.0.0' }}</div>
            <h2>What's new?</h2>
          </div>
          <div class="modal-content">
            <div v-for="(patch, index) in patches" :key="index" class="preview-item">
              <div class="preview-icon" :class="patch.category || 'feature'">
                {{ patch.icon || '✨' }}
              </div>
              <div class="preview-text">
                <div class="preview-title">{{ patch.title || 'New feature' }}</div>
                <div 
                  v-if="patch.description" 
                  class="preview-description markdown-body"
                  v-html="renderMarkdown(patch.description)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Save, Eye, Trash2 } from 'lucide-vue-next'
import { marked } from 'marked'
import { useToast } from '@/composables/useToast'

marked.setOptions({
  breaks: true,
  gfm: true
})

const toast = useToast()
const showPreview = ref(true)
const saving = ref(false)
const currentVersion = ref('1.1.3')

const initialPatches = [
  {
    icon: '🐛',
    title: 'Fixed sync issues',
    description: 'Fixed critical bugs with cloud synchronization',
    category: 'bugfix'
  }
]

const patches = ref([...initialPatches])

const renderMarkdown = (text: string) => {
  try {
    return marked(text)
  } catch (e) {
    return text
  }
}

const saveVersion = async () => {
  saving.value = true
  
  const versionData = {
    version: currentVersion.value,
    patchNotes: patches.value.map(p => ({
      icon: p.icon || '✨',
      title: p.title,
      description: p.description,
      category: p.category.toUpperCase()
    }))
  }

  try {
    const result = await window.electronAPI.db.createVersion(
      versionData.version,
      versionData.patchNotes
    )

    if (result) {
      toast.success('Version saved successfully! 🎉')
      currentVersion.value = '1.0.' + (parseInt(currentVersion.value.split('.')[2] || '0') + 1)
      patches.value = [
        {
          icon: '✨',
          title: '',
          description: '',
          category: 'feature'
        }
      ]
    }
  } catch (error) {
    toast.error('Failed to save version')
  } finally {
    saving.value = false
  }
}

const addPatch = () => {
  patches.value.push({
    icon: '✨',
    title: '',
    description: '',
    category: 'feature'
  })
}

const removePatch = (index: number) => {
  patches.value.splice(index, 1)
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.admin-patch-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #fff;
}

.editor-header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
  
  h2 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    gap: 12px;
    
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: 0.2s;
      
      &.preview-btn {
        background: #2a2a2a;
        color: #fff;
        
        &:hover {
          background: #333;
        }
      }
      
      &.save-btn {
        background: #8B5CF6;
        color: #fff;
        
        &:hover:not(:disabled) {
          background: #7C3AED;
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  
  &.with-preview {
    .editor-panel {
      width: 50%;
    }
    .preview-panel {
      width: 50%;
    }
  }
  
  .editor-panel {
    width: 100%;
    padding: 24px;
    overflow-y: auto;
    background: #1e1e1e;
  }
  
  .preview-panel {
    padding: 24px;
    overflow-y: auto;
    background: #2a2a2a;
    border-left: 1px solid #333;
    
    h3 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  }
}

.version-input {
  margin-bottom: 24px;
  
  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #888;
    text-transform: uppercase;
  }
  
  .version-field {
    width: 200px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #333;
    background: #2a2a2a;
    color: #fff;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #8B5CF6;
    }
  }
}

.patches-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.patch-item {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #333;
  
  .patch-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    .patch-number {
      font-size: 12px;
      font-weight: 600;
      color: #888;
    }
    
    .remove-patch {
      padding: 4px 8px;
      background: none;
      border: none;
      color: #888;
      cursor: pointer;
      border-radius: 4px;
      
      &:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #EF4444;
      }
    }
  }
  
  .patch-fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .field-row {
    display: flex;
    gap: 12px;
    
    .icon-field {
      width: 80px;
      
      input {
        text-align: center;
        font-size: 18px;
      }
    }
    
    .category-field {
      flex: 1;
    }
  }
  
  .field {
    label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #888;
      text-transform: uppercase;
    }
    
    input, select, textarea {
      width: 100%;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #333;
      background: #1e1e1e;
      color: #fff;
      font-size: 13px;
      
      &:focus {
        outline: none;
        border-color: #8B5CF6;
      }
    }
    
    textarea {
      resize: vertical;
      font-family: monospace;
    }
    
    select {
      cursor: pointer;
    }
  }
}

.add-patch-btn {
  width: 100%;
  padding: 12px;
  border: 2px dashed #333;
  border-radius: 8px;
  background: none;
  color: #888;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: 0.2s;
  
  &:hover {
    border-color: #8B5CF6;
    color: #8B5CF6;
  }
}

// Preview styles
.preview-modal {
  background: #1e1e1e;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #333;
  
  .modal-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #333;
    
    .version-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      background: #8B5CF6;
      color: white;
    }
    
    h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      color: #fff;
    }
  }
  
  .modal-content {
    padding: 20px;
    max-height: 400px;
    overflow-y: auto;
  }
  
  .preview-item {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    
    .preview-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      
      &.feature { background: linear-gradient(135deg, #8B5CF6, #2d1b4e); }
      &.improvement { background: linear-gradient(135deg, #3B82F6, #1e3a6b); }
      &.bugfix { background: linear-gradient(135deg, #EF4444, #631212); }
      &.performance { background: linear-gradient(135deg, #10B981, #0c5238); }
    }
    
    .preview-text {
      flex: 1;
      
      .preview-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
        color: #fff;
      }
      
      .preview-description {
        font-size: 12px;
        line-height: 1.6;
        color: #aaa;
        
        :deep(h1), :deep(h2), :deep(h3) {
          font-size: 14px;
          margin: 8px 0 4px;
          color: #fff;
        }
        
        :deep(ul), :deep(ol) {
          margin: 4px 0;
          padding-left: 20px;
        }
        
        :deep(li) {
          margin: 2px 0;
        }
        
        :deep(strong) {
          color: #fff;
        }
        
        :deep(a) {
          color: #8B5CF6;
          text-decoration: none;
          
          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }
}
</style>