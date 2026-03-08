export const safeString = (str: string | null | undefined, fallback: string = 'Unknown'): string => {
  if (!str) return fallback
  const trimmed = str.trim()
  return trimmed || fallback
}

export const safeDisplayName = (name: string | null | undefined): string => {
  return safeString(name, 'Unknown App')
}

export const safeFirstChar = (str: string | null | undefined): string => {
  const safe = safeString(str, '?')
  return safe[0]?.toUpperCase() || '?'
}