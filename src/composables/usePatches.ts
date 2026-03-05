import { ref } from 'vue'

export interface PatchNote {
  icon: string
  text: string
}

export function usePatches() {
  const currentVersion = ref('1.0.0')
  const patchNotes = ref<PatchNote[]>([])

  const fetchPatches = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/version/latest')
      const data = await response.json()
      
      currentVersion.value = data.version
      patchNotes.value = data.patchNotes.map((note: any) => ({
        icon: note.icon,
        title: note.title,
        desc: note.description,
        category: note.category
      }))
    } catch (error) {
      console.error('Failed to fetch patches')
    }
  }

  return {
    currentVersion,
    patchNotes,
    fetchPatches
  }
}