<template>
  <div class="media-view">
    <h1>Media Manager</h1>
    <p class="secret-badge">🔒 Secret Dev Tool</p>
    
    <div class="converter-section">
      <h2>Image to Base64 Converter</h2>
      
      <div class="upload-area" @drop="handleDrop" @dragover.prevent @dragenter.prevent>
        <input 
          type="file" 
          ref="fileInput" 
          accept="image/*" 
          multiple
          @change="handleFileSelect"
          class="hidden"
        >
        <button class="upload-btn" @click="fileInput?.click()">
          <Upload :size="20" />
          Select Images
        </button>
        <p class="hint">or drag & drop (supports multiple)</p>
      </div>

      <div v-if="files.length" class="files-list">
        <div v-for="(file, index) in files" :key="index" class="file-item">
          <div class="file-header" :style="{ background: file.dominantColor + '20' }">
            <div class="file-info">
              <ImageIcon :size="16" />
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatBytes(file.size) }}</span>
            </div>
            
            <div class="file-actions">
              <button v-if="!file.converted" @click="convertFile(file)" class="action-btn">
                <RefreshCw :size="14" />
              </button>
              <button @click="removeFile(index)" class="action-btn danger">
                <X :size="14" />
              </button>
            </div>
          </div>

          <div class="file-preview" :style="{ background: file.dominantColor + '10' }">
            <img :src="file.preview" :alt="file.name">
          </div>

          <div v-if="file.colors" class="color-suggestions">
            <div class="color-label">Suggested themes:</div>
            <div class="color-grid">
              <div 
                v-for="(color, idx) in file.colors" 
                :key="idx"
                class="color-chip"
                :style="{ background: color }"
                @click="selectColor(file, color)"
              >
                <Check v-if="file.selectedColor === color" :size="12" class="color-check" />
                <!-- <div v-else class="color-actions">
                  <button class="color-action" @click.stop="copyColor(color)" title="Copy HEX">
                    <Copy :size="10" />
                  </button>
                </div> -->
              </div>
            </div>
          </div>

          <div v-if="file.base64" class="file-result">
            <div class="base64-actions">
              <button class="base64-action-btn" @click="copyFileBase64(file)" :title="file.copied ? 'Copied!' : 'Copy Base64'">
                <Copy v-if="!file.copied" :size="14" />
                <Check v-else :size="14" class="success" />
                <span>Base64</span>
              </button>
              <button class="base64-action-btn" @click="copyColor(file.selectedColor)" title="Copy HEX">
                <Hash :size="14" />
                <span>HEX</span>
              </button>
              <button class="base64-action-btn delete" @click="removeFile(index)" title="Delete">
                <Trash2 :size="14" />
                <span>Delete</span>
              </button>
            </div>
            
            <div class="save-section">
              <input 
                v-model="file.customName" 
                type="text" 
                placeholder="Name for saving"
                class="name-input"
              >
              <button 
                class="save-btn" 
                @click="saveFile(file)"
                :disabled="!file.customName"
                :style="{ background: file.selectedColor }"
              >
                <Save :size="14" />
                Save
              </button>
            </div>
          </div>
        </div>

        <div v-if="files.length" class="bulk-actions">
          <button class="bulk-btn" @click="convertAll">
            <RefreshCw :size="14" />
            Convert All
          </button>
          <button class="bulk-btn" @click="clearAll">
            <Trash2 :size="14" />
            Clear All
          </button>
        </div>
      </div>
    </div>

    <div class="memory-section" v-if="savedImages.length">
      <h2>Saved Images ({{ savedImages.length }})</h2>
      
      <div class="images-grid">
        <div v-for="img in savedImages" :key="img.id" class="image-card" :style="{ borderColor: img.color + '40' }">
          <img :src="img.base64" :alt="img.name" class="card-img">
          <div class="card-info" :style="{ background: img.color + '10' }">
            <p class="card-name">{{ img.name }}</p>
            <p class="card-size">{{ formatBytes(img.size) }}</p>
          </div>
          <div class="card-actions">
            <button @click="copySavedImage(img.base64)" title="Copy Base64">
              <Copy :size="14" />
            </button>
            <button @click="copyColor(img.color)" title="Copy HEX">
              <Hash :size="14" />
            </button>
            <button @click="removeImage(img.id)" title="Delete" class="danger">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
      
      <button class="clear-all-btn" @click="clearAllImages">
        <Trash2 :size="16" />
        Clear All ({{ savedImages.length }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Upload, X, Copy, Check, Save, Trash2, RefreshCw, Image as ImageIcon, Hash } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { Vibrant } from 'node-vibrant/browser'

const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)

interface ImageFile {
  file: File
  name: string
  size: number
  preview: string
  base64: string
  converted: boolean
  customName: string
  copied: boolean
  dominantColor: string
  colors: string[]
  selectedColor: string
}

const files = ref<ImageFile[]>([])

interface SavedImage {
  id: string
  name: string
  base64: string
  size: number
  color: string
  date: number
}

const savedImages = ref<SavedImage[]>([])

const darkenColor = (hex: string, percent: number): string => {
  if (!hex || typeof hex !== 'string') return '#6366f1'
  try {
    let r = parseInt(hex.substring(1,3), 16)
    let g = parseInt(hex.substring(3,5), 16)
    let b = parseInt(hex.substring(5,7), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#6366f1'
    r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))))
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))))
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))))
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  } catch {
    return '#6366f1'
  }
}

const lightenColor = (hex: string, percent: number): string => {
  if (!hex || typeof hex !== 'string') return '#6366f1'
  try {
    let r = parseInt(hex.substring(1,3), 16)
    let g = parseInt(hex.substring(3,5), 16)
    let b = parseInt(hex.substring(5,7), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#6366f1'
    r = Math.max(0, Math.min(255, Math.floor(r + (255 - r) * percent)))
    g = Math.max(0, Math.min(255, Math.floor(g + (255 - g) * percent)))
    b = Math.max(0, Math.min(255, Math.floor(b + (255 - b) * percent)))
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  } catch {
    return '#6366f1'
  }
}

const extractColors = async (imageUrl: string): Promise<{ dominant: string, variants: string[] }> => {
  return new Promise((resolve) => {
    try {
      Vibrant.from(imageUrl).getPalette().then((palette) => {
        const colors: string[] = []
        const swatches = [
          palette.Vibrant,
          palette.Muted,
          palette.DarkVibrant,
          palette.DarkMuted,
          palette.LightVibrant,
          palette.LightMuted
        ].filter(s => s)
        
        swatches.forEach(s => {
          if (s) {
            const hex = s.hex
            colors.push(hex)
          }
        })
        
        if (colors.length > 0) {
          const dominant = colors[0]
          colors.push(
            darkenColor(dominant, 0.2),
            lightenColor(dominant, 0.2),
            darkenColor(dominant, 0.4),
            lightenColor(dominant, 0.4)
          )
        }
        
        const uniqueColors = [...new Set(colors)]
        resolve({ dominant: uniqueColors[0] || '#6366f1', variants: uniqueColors.slice(0, 6) })
      }).catch(() => {
        resolve({ dominant: '#6366f1', variants: ['#6366f1', '#4f46e5', '#818cf8'] })
      })
    } catch {
      resolve({ dominant: '#6366f1', variants: ['#6366f1', '#4f46e5', '#818cf8'] })
    }
  })
}

const rgbToHex = (rgb: number[]): string => {
  return '#' + rgb.map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

const loadSavedImages = () => {
  try {
    const saved = localStorage.getItem('media_images')
    if (saved) {
      savedImages.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load saved images:', e)
  }
}
loadSavedImages()

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const droppedFiles = Array.from(e.dataTransfer?.files || [])
  processFiles(droppedFiles)
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  const selectedFiles = Array.from(input.files || [])
  processFiles(selectedFiles)
}

const processFiles = async (newFiles: File[]) => {
  const imageFiles = newFiles.filter(f => f.type.startsWith('image/'))
  if (imageFiles.length === 0) {
    toast.error('Only image files are allowed')
    return
  }
  const tooLarge = imageFiles.some(f => f.size > 5 * 1024 * 1024)
  if (tooLarge) {
    toast.error('Some files exceed 5MB limit')
    return
  }
  for (const file of imageFiles) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const preview = e.target?.result as string
      const { dominant, variants } = await extractColors(preview)
      const imageFile: ImageFile = {
        file,
        name: file.name,
        size: file.size,
        preview,
        base64: '',
        converted: false,
        customName: file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        copied: false,
        dominantColor: dominant,
        colors: variants,
        selectedColor: dominant
      }
      files.value.push(imageFile)
    }
    reader.readAsDataURL(file)
  }
}

const selectColor = (file: ImageFile, color: string) => {
  file.selectedColor = color
}

const copyColor = async (color: string) => {
  try {
    await navigator.clipboard.writeText(color)
    toast.success(`Copied ${color}`)
  } catch {
    toast.error('Failed to copy')
  }
}

const convertFile = (file: ImageFile) => {
  file.base64 = file.preview
  file.converted = true
}

const convertAll = () => {
  files.value.forEach(f => {
    if (!f.converted) {
      f.base64 = f.preview
      f.converted = true
    }
  })
  toast.success(`Converted ${files.value.length} images`)
}

const copyFileBase64 = async (file: ImageFile) => {
  try {
    await navigator.clipboard.writeText(file.base64)
    file.copied = true
    setTimeout(() => file.copied = false, 2000)
    toast.success('Copied!')
  } catch {
    toast.error('Failed to copy')
  }
}

const saveFile = (file: ImageFile) => {
  if (!file.base64 || !file.customName) return
  const newImage: SavedImage = {
    id: Date.now().toString() + Math.random(),
    name: file.customName,
    base64: file.base64,
    size: file.size,
    color: file.selectedColor,
    date: Date.now()
  }
  savedImages.value.push(newImage)
  localStorage.setItem('media_images', JSON.stringify(savedImages.value))
  toast.success(`Saved "${file.customName}"`)
  removeFile(files.value.indexOf(file))
}

const removeFile = (index: number) => {
  files.value.splice(index, 1)
  if (files.value.length === 0 && fileInput.value) {
    fileInput.value.value = ''
  }
}

const clearAll = () => {
  files.value = []
  if (fileInput.value) fileInput.value.value = ''
}

const copySavedImage = async (base64: string) => {
  try {
    await navigator.clipboard.writeText(base64)
    toast.success('Copied!')
  } catch {
    toast.error('Failed to copy')
  }
}

const removeImage = (id: string) => {
  savedImages.value = savedImages.value.filter(img => img.id !== id)
  localStorage.setItem('media_images', JSON.stringify(savedImages.value))
  toast.success('Removed')
}

const clearAllImages = () => {
  if (confirm(`Remove all ${savedImages.value.length} images?`)) {
    savedImages.value = []
    localStorage.removeItem('media_images')
    toast.success('All images cleared')
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.media-view {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  h1 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 4px;
    @include themify() { color: themed('text-primary'); }
  }
  .secret-badge {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
    margin-bottom: 24px;
    @include themify() {
      background: themed('brand-primary') + '20';
      color: themed('brand-primary');
    }
  }
  h2 {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 16px;
    @include themify() { color: themed('text-primary'); }
  }
  .converter-section {
    @include themify() {
      background: themed('bg-card');
      border: 1px solid themed('border-color');
    }
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 32px;
  }
  .upload-area {
    border: 2px dashed;
    border-radius: 8px;
    padding: 32px;
    text-align: center;
    cursor: pointer;
    @include themify() {
      border-color: themed('border-color');
      &:hover { border-color: themed('brand-primary'); }
    }
    .upload-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      @include themify() {
        background: themed('brand-primary');
        color: white;
        &:hover { opacity: 0.9; }
      }
    }
    .hint {
      margin-top: 8px;
      font-size: 12px;
      @include themify() { color: themed('text-secondary'); }
    }
  }
  .hidden { display: none; }
  .files-list {
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .file-item {
    border: 1px solid;
    border-radius: 8px;
    overflow: hidden;
    @include themify() {
      border-color: themed('border-color');
      background: themed('bg-nav');
    }
  }
  .file-header {
    padding: 12px;
  }
  .file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    @include themify() { color: themed('text-secondary'); }
    .file-name {
      font-weight: 500;
      @include themify() { color: themed('text-primary'); }
    }
    .file-size { font-size: 11px; }
  }
  .file-actions {
    display: flex;
    gap: 4px;
    .action-btn {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      @include themify() {
        background: themed('bg-content');
        color: themed('text-secondary');
        &:hover {
          background: themed('nav-bar-tab');
          color: themed('text-primary');
        }
        &.danger:hover { color: #ef4444; }
      }
    }
  }
  .file-preview {
    padding: 12px;
    display: flex;
    justify-content: center;
    img {
      max-width: 100px;
      max-height: 100px;
      border-radius: 4px;
    }
  }
  .color-suggestions {
    padding: 12px;
    border-top: 1px solid;
    @include themify() { border-color: themed('border-color'); }
    .color-label {
      font-size: 11px;
      margin-bottom: 8px;
      @include themify() { color: themed('text-secondary'); }
    }
    .color-grid {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .color-chip {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      position: relative;
      cursor: pointer;
      transition: transform 0.2s;
      &:hover {
        transform: scale(1.1);
        z-index: 10;
      }
    }
    .color-check {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .color-actions {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      background: rgba(0,0,0,0.3);
      border-radius: 8px;
      .color-chip:hover & {
        opacity: 1;
      }
      .color-action {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        &:hover {
          background: rgba(255,255,255,0.2);
        }
      }
    }
  }
  .file-result {
    padding: 12px;
    border-top: 1px solid;
    @include themify() { border-color: themed('border-color'); }
  }
  .base64-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    .base64-action-btn {
      flex: 1;
      padding: 8px;
      border: none;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      font-size: 12px;
      @include themify() {
        background: themed('bg-content');
        color: themed('text-secondary');
        &:hover {
          background: themed('nav-bar-tab');
          color: themed('text-primary');
        }
        &.delete:hover {
          background: #ef4444;
          color: white;
        }
      }
      .success {
        color: #43b581;
      }
    }
  }
  .save-section {
    display: flex;
    gap: 8px;
    align-items: center;
    .name-input {
      flex: 1;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      @include themify() {
        background: themed('bg-content');
        border: 1px solid themed('border-color');
        color: themed('text-primary');
        &:focus {
          outline: none;
          border-color: themed('brand-primary');
        }
      }
    }
    .save-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      color: white;
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  .bulk-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid;
    @include themify() { border-color: themed('border-color'); }
    .bulk-btn {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      @include themify() {
        background: themed('bg-content');
        color: themed('text-secondary');
        &:hover { background: themed('nav-bar-tab'); }
      }
    }
  }
  .memory-section {
    margin-top: 32px;
    .images-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .image-card {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid;
      @include themify() { background: themed('bg-card'); }
      .card-img {
        width: 100%;
        height: 120px;
        object-fit: cover;
      }
      .card-info {
        padding: 8px;
        .card-name {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          @include themify() { color: themed('text-primary'); }
        }
        .card-size {
          font-size: 11px;
          @include themify() { color: themed('text-secondary'); }
        }
      }
      .card-actions {
        display: flex;
        border-top: 1px solid;
        @include themify() { border-color: themed('border-color'); }
        button {
          flex: 1;
          padding: 8px;
          border: none;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          @include themify() {
            color: themed('text-secondary');
            &:hover {
              background: themed('nav-bar-tab');
              color: themed('text-primary');
            }
            &.danger:hover {
              background: #ef4444;
              color: white;
            }
          }
        }
      }
    }
    .clear-all-btn {
      width: 100%;
      padding: 12px;
      border: 1px solid;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      @include themify() {
        border-color: themed('border-color');
        background: themed('bg-content');
        color: #ef4444;
        &:hover {
          background: rgba(239, 68, 68, 0.1);
        }
      }
    }
  }
}
</style>