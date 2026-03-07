<template>
  <div class="music-popup">
    <button class="trigger-btn" @click.stop="open">
      <div class="icon-wrapper" :class="{ 'active': track.isPlaying }">
        <component :is="buttonIcon" :size="20" />
        <span v-if="showDot" class="live-dot" />
      </div>
    </button>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isOpen" class="modal-overlay" ref="overlayRef" @click.self="close">
          <div class="modal" ref="modalRef" @click.stop>
            <div v-if="!track.title && !track.isPlaying" class="empty">
              <div class="empty-icon">
                <Music :size="40" />
              </div>
              <div class="empty-title">Spotify is not running</div>
              <div class="empty-hint">Open Spotify to see what's playing</div>
            </div>

            <div v-else-if="track.title" class="player">
              <div class="player-header">
                <div class="player-badge">
                  <span class="badge-dot">🟢</span>
                  Spotify
                </div>
                <span class="player-quality">{{ track.bitrate }}</span>
              </div>
              
              <div class="track">
                <h3 class="track-title">{{ displayTitle }}</h3>
                <p class="track-artist">{{ track.artist || 'Unknown artist' }}</p>
              </div>

              <div class="progress">
                <div class="waveform">
                  <div 
                    v-for="(bar, idx) in waveformBars" 
                    :key="idx"
                    class="wave-bar"
                    :class="{ 'active': idx / waveformBars.length < track.progress }"
                    :style="{
                      height: bar + 'px',
                      opacity: idx / waveformBars.length < track.progress ? 1 : 0.25
                    }"
                  />
                </div>
                <div class="time">
                  <span>{{ formatTime(track.position) }}</span>
                  <span>{{ formatTime(track.duration) }}</span>
                </div>
              </div>
            </div>

            <div v-else class="empty">
              <div class="empty-icon">
                <Music :size="40" />
              </div>
              <div class="empty-title">No track playing</div>
              <div class="empty-hint">Play something on Spotify</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Music, Disc } from 'lucide-vue-next'
import { useModal } from '@/composables/useModal'
import type { TrackInfo } from '@/types/media'

const track = ref<TrackInfo>({ 
  title: '', 
  artist: '', 
  isPlaying: false,
  bitrate: '320kbps',
  duration: 0,
  position: 0,
  progress: 0
})

const { isOpen, open, close } = useModal()

const waveformBars = [4,8,12,18,24,28,32,34,32,28,24,18,12,8,4,8,12,18,24,28,32,34,32,28,24,18,12,8,4]

const buttonIcon = computed(() => track.value.isPlaying ? Disc : Music)
const showDot = computed(() => track.value.isPlaying)

const formatTime = (seconds: number) => {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const displayTitle = computed(() => {
  if (!track.value.title) return 'No track'
  return track.value.title.length > 35 
    ? track.value.title.slice(0, 35) + '…' 
    : track.value.title
})

const updateTrack = (data: any) => {
  if (!data) return
  
  track.value = {
    ...data,
    progress: data.duration ? data.position / data.duration : 0
  }
}

onMounted(() => {
  window.electronAPI.media.subscribe()
  
  window.electronAPI.media.onMediaUpdated((data) => {
    updateTrack(data)
  })
  
  window.electronAPI.media.getTrack().then((data) => {
    updateTrack(data)
  })
})

onUnmounted(() => {
  window.electronAPI.media.unsubscribe()
})
</script>

<style lang="scss" scoped>
@use '@/styles/theme-mixins' as *;

.music-popup {
  display: inline-block;
}

.trigger-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .2s ease;
  position: relative;
  @include themify() {
    color: themed("text-secondary");
  }
}

.icon-wrapper:hover {
  background: var(--nav-bar-tab);
  color: white;
}

.icon-wrapper.active {
  color: #1DB954;
}

.icon-wrapper.active:hover {
  background: var(--nav-bar-tab);
  color: #1DB954;
}

.live-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1DB954;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
}

.modal {
  position: absolute;
  left: 80px;
  top: 60px;
  width: 280px;
  border-radius: 20px;
  overflow: hidden;
  pointer-events: auto;
}

.empty {
  padding: 32px 24px;
  text-align: center;
  @include themify() {
    color: themed("text-secondary");
  }
}

.empty-icon {
  margin-bottom: 16px;
  @include themify() {
    color: themed("text-secondary");
  }
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 13px;
  opacity: 0.6;
}

.player {
  padding: 20px;
  background: linear-gradient(135deg, #1DB954 0%, #1ED760 100%);
  color: white;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 12px;
}

.player-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, .2);
  padding: 4px 10px;
  border-radius: 30px;
  backdrop-filter: blur(5px);
  font-weight: 500;
}

.badge-dot {
  font-size: 14px;
}

.player-quality {
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, .2);
  padding: 4px 8px;
  border-radius: 12px;
  letter-spacing: 0.5px;
}

.track {
  margin-bottom: 20px;
}

.track-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.3;
  word-break: break-word;
}

.track-artist {
  font-size: 14px;
  opacity: 0.8;
  word-break: break-word;
}

.progress {
  margin-top: 12px;
}

.waveform {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  margin-bottom: 16px;
}

.wave-bar {
  flex: 1;
  min-width: 2px;
  background: white;
  border-radius: 2px;
  transition: opacity 0.2s ease;
  transform-origin: bottom;
}

.wave-bar.active {
  opacity: 1 !important;
}

.time {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-family: monospace;
  opacity: .8;
  letter-spacing: 0.5px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>