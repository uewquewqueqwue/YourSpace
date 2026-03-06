import { ref } from 'vue'

export interface PatchNote {
  icon: string
  title: string
  desc: string
  category: string
}

export function usePatches() {
  const currentVersion = ref('1.0.0')
  const patchNotes = ref<PatchNote[]>([])

  const fetchPatches = async () => {
    try {
      const data = await window.electronAPI.db.getLatestVersion()
      currentVersion.value = data.version
      patchNotes.value = data.patchNotes.map((note: any) => ({
        icon: note.icon,
        title: note.title,
        desc: note.description || "",
        category: note.category || "FEATURE"
      }))
    } catch (error) {
      console.error('Failed to fetch patches:', error)
    }
  }

  return {
    currentVersion,
    patchNotes,
    fetchPatches
  }
}