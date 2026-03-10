import { ref } from 'vue'
import { useToast } from './useToast'
import { useTodoStore } from '@/stores/todo'

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

  const playBeep = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
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
      
      gainNode.gain.setValueAtTime(0.1, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration)
      
      oscillator.start()
      oscillator.stop(context.currentTime + duration)
    } catch (error) {
      console.warn('Audio play failed:', error)
    }
  }

  const playSound = (type: 'deadline' | 'urgent' | 'overdue') => {
    switch(type) {
      case 'deadline':
        playBeep(523.25, 0.3)
        setTimeout(() => playBeep(523.25, 0.3), 300)
        break
      case 'urgent':
        playBeep(659.25, 0.2, 'square')
        setTimeout(() => playBeep(659.25, 0.2, 'square'), 250)
        setTimeout(() => playBeep(659.25, 0.2, 'square'), 500)
        break
      case 'overdue':
        playBeep(440, 0.5, 'sawtooth')
        break
    }
  }

  const checkDeadlines = () => {
    const now = new Date()
    const currentTime = now.getTime()
    const todos = todoStore.todos.value

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
      interval = setInterval(checkDeadlines, 60 * 1000)
    }
  }

  const stopChecking = () => {
    if (interval) {
      clearInterval(interval)
      interval = null
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