export interface AppVersion {
  id: string
  version: string
  releaseDate: Date
  isRequired: boolean
  minVersion?: string | null
  downloadUrl?: string | null
  size?: number | null
  changelog?: string | null
  patchNotes: PatchNote[]
  createdAt: Date
  updatedAt: Date
}

export interface PatchNote {
  id: string
  versionId: string
  icon: string
  title: string
  description?: string | null
  category: 'FEATURE' | 'IMPROVEMENT' | 'BUGFIX' | 'PERFORMANCE' | 'SECURITY' | 'OTHER'
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateVersionRequest {
  token: string
  version: string
  patchNotes: Array<{
    icon: string
    title: string
    description?: string
    category?: string
  }>
}

export interface UpdateInfo {
  version: string
  files: Array<{ url: string; size: number }>
  path: string
  sha512: string
  releaseDate: string
  releaseName?: string
  releaseNotes?: string
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  total: number
  transferred: number
}