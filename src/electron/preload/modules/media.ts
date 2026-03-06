import { ipcRenderer } from 'electron'
import type { TrackInfo, MediaAPI } from '@/types/media'

export function setupMediaAPI(): MediaAPI {
  const mediaUpdateCallbacks: Array<(track: TrackInfo) => void> = []

  ipcRenderer.on('media:updated', (_, track: TrackInfo) => {
    mediaUpdateCallbacks.forEach(cb => cb(track))
  })

  return {
    getTrack: () => ipcRenderer.invoke('media:get-track') as Promise<TrackInfo>,
    subscribe: () => ipcRenderer.invoke('media:subscribe') as Promise<void>,
    unsubscribe: () => ipcRenderer.invoke('media:unsubscribe') as Promise<void>,
    onMediaUpdated: (callback: (track: TrackInfo) => void) => {
      mediaUpdateCallbacks.push(callback)
    }
  }
}