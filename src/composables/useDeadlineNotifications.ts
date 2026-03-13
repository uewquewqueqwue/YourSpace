import { ref } from 'vue'
import { useToast } from './useToast'
import { useTodoStore } from '@/stores/todo.pinia'

export function useDeadlineNotifications() {
  const toast = useToast()
  const todoStore = useTodoStore()
  const notifiedTasks = ref<Set<string>>(new Set())
  let interval: NodeJS.Timeout | null = null
  let audioContext: AudioContext | null = null

  const initAudioContext = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioContext
  }

  const playBeep = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.15) => {
    try {
      const context = initAudioContext()
      
      if (context.state === 'suspended') {
        context.resume()
      }

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = type
      
      // Smooth envelope for pleasant sound
      gainNode.gain.setValueAtTime(0, context.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
      
      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + duration)
    } catch (error) {
      console.warn('Audio play failed:', error)
    }
  }

  const playSound = (type: 'deadline' | 'urgent' | 'overdue') => {
    switch(type) {
      case 'deadline':
        // Pleasant notification: C5 -> E5 (major third)
        playBeep(523.25, 0.15, 'sine', 0.12)
        setTimeout(() => playBeep(659.25, 0.2, 'sine', 0.1), 150)
        break
      case 'urgent':
        // Gentle urgency: G5 -> C6 (perfect fourth)
        playBeep(783.99, 0.12, 'sine', 0.15)
        setTimeout(() => playBeep(1046.50, 0.15, 'sine', 0.12), 120)
        setTimeout(() => playBeep(1046.50, 0.18, 'sine', 0.1), 270)
        break
      case 'overdue':
        // Soft reminder: A4 -> C5 (minor third)
        playBeep(440, 0.2, 'sine', 0.12)
        setTimeout(() => playBeep(523.25, 0.25, 'sine', 0.1), 200)
        break
    }
  }

  const checkDeadlines = () => {
    const now = new Date()
    const currentTime = now.getTime()
    const todos = todoStore.todos

    todos.forEach(todo => {
      if (!todo.dueDate || todo.completed) return

      const dueDate = new Date(todo.dueDate)
      const dueTime = dueDate.getTime()
      const timeDiff = dueTime - currentTime
      const hoursLeft = timeDiff / (1000 * 60 * 60)
      const minutesLeft = timeDiff / (1000 * 60)

      if (timeDiff < 0 && !notifiedTasks.value.has(todo.id + '_overdue')) {
        toast.error(`⚠️ Task "${todo.title}" is overdue!`)
        playSound('overdue')
        notifiedTasks.value.add(todo.id + '_overdue')
      }
      else if (hoursLeft <= 24 && hoursLeft > 23 && !notifiedTasks.value.has(todo.id + '_24h')) {
        toast.info(`📅 Task "${todo.title}" due tomorrow`)
        playSound('deadline')
        notifiedTasks.value.add(todo.id + '_24h')
      }
      else if (hoursLeft <= 5 && hoursLeft > 4 && !notifiedTasks.value.has(todo.id + '_5h')) {
        const dueTimeStr = dueDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        toast.info(`🔥 Task "${todo.title}" due at ${dueTimeStr} (${Math.floor(hoursLeft)} hours left)`)
        playSound('deadline')
        notifiedTasks.value.add(todo.id + '_5h')
      }
      else if (hoursLeft <= 1 && hoursLeft > 0 && !notifiedTasks.value.has(todo.id + '_1h')) {
        const dueTimeStr = dueDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        toast.error(`⚡ Task "${todo.title}" due at ${dueTimeStr} (${Math.floor(minutesLeft)} minutes!)`)
        playSound('urgent')
        notifiedTasks.value.add(todo.id + '_1h')
      }
      else if (minutesLeft <= 30 && minutesLeft > 0 && !notifiedTasks.value.has(todo.id + '_30m')) {
        const dueTimeStr = dueDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        toast.error(`⏰ Task "${todo.title}" due at ${dueTimeStr} (${Math.floor(minutesLeft)} minutes!)`)
        playSound('urgent')
        notifiedTasks.value.add(todo.id + '_30m')
      }
      else if (minutesLeft <= 15 && minutesLeft > 0 && !notifiedTasks.value.has(todo.id + '_15m')) {
        const dueTimeStr = dueDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        toast.error(`⏰ Task "${todo.title}" due in ${Math.floor(minutesLeft)} minutes!`)
        playSound('urgent')
        notifiedTasks.value.add(todo.id + '_15m')
      }
    })
  }

  const resetNotifications = (todoId: string) => {
    const keys = Array.from(notifiedTasks.value.keys())
    keys.forEach(key => {
      if (key.startsWith(todoId)) {
        notifiedTasks.value.delete(key)
      }
    })
  }

  const startChecking = () => {
    checkDeadlines()
    if (!interval) {
      // Check every 5 minutes instead of 1 minute to reduce memory usage
      interval = setInterval(checkDeadlines, 5 * 60 * 1000)
    }
  }

  const stopChecking = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
    }
    // Clean up audio context
    if (audioContext) {
      audioContext.close().catch(() => {})
      audioContext = null
    }
  }

  return {
    resetNotifications,
    checkDeadlines,
    startChecking,
    stopChecking,
    notifiedTasks
  }
}