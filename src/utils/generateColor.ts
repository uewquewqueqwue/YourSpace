export const generateColor = (name: string): string => {
  const colors = ['#a259ff', '#22a6f0', '#4ade80', '#f43f5e', '#fb923c', '#8b5cf6', '#ec4899', '#14b8a6']
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return colors[hash % colors.length]
}
