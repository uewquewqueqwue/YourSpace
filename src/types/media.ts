export type MediaPlaybackStatus = 'Playing' | 'Paused' | 'Stopped' | 'Closed' | 'Changing' | 'Opened'

export interface MediaSessionInfo {
  appId: string
  title: string
  artist: string
  playbackStatus: MediaPlaybackStatus
  duration: number
  position: number
}

export interface TrackInfo {
  title: string
  artist: string
  isPlaying: boolean
  bitrate: string,
  duration: number,
  position: number,
  progress: number
}

export interface MediaAPI {
  getTrack: () => Promise<TrackInfo>
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  onMediaUpdated: (callback: (track: TrackInfo) => void) => void
}