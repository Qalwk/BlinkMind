// Zustand store для управления историей сессий с сохранением в localStorage

import { create } from 'zustand'
import type { TrackingSession } from '@/shared/types/tracking.types'

interface SessionHistoryState {
  sessions: TrackingSession[]
  
  // Действия
  addSession: (session: TrackingSession) => void
  getSessionsByDate: (date: Date) => TrackingSession[]
  getSessionsByMonth: (year: number, month: number) => Map<string, TrackingSession[]>
  deleteSession: (sessionId: string) => void
  clearHistory: () => void
}

const STORAGE_KEY = 'blinkmind_session_history'

// Загрузка истории из localStorage
function loadSessionsFromStorage(): TrackingSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Ошибка при загрузке истории сессий:', error)
  }
  return []
}

// Сохранение истории в localStorage
function saveSessionsToStorage(sessions: TrackingSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.error('Ошибка при сохранении истории сессий:', error)
  }
}

export const useSessionHistoryStore = create<SessionHistoryState>((set, get) => ({
  sessions: loadSessionsFromStorage(),

  // Добавить новую сессию
  addSession: (session: TrackingSession) => {
    console.log('📝 Добавление сессии в историю:', {
      id: session.id,
      startTime: new Date(session.startTime).toLocaleString('ru-RU'),
      duration: session.totalDuration,
      isPomodoroSession: session.isPomodoroSession,
      pomodoroCount: session.pomodoroCount
    })
    
    set((state) => {
      const newSessions = [...state.sessions, session]
      saveSessionsToStorage(newSessions)
      console.log('✅ Сессия добавлена. Всего сессий в истории:', newSessions.length)
      return { sessions: newSessions }
    })
  },

  // Получить сессии за конкретную дату
  getSessionsByDate: (date: Date) => {
    const state = get()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return state.sessions.filter((session) => {
      const sessionDate = new Date(session.startTime)
      return sessionDate >= startOfDay && sessionDate <= endOfDay
    })
  },

  // Получить все сессии за месяц, сгруппированные по дням
  getSessionsByMonth: (year: number, month: number) => {
    const state = get()
    const result = new Map<string, TrackingSession[]>()

    state.sessions.forEach((session) => {
      const sessionDate = new Date(session.startTime)
      if (sessionDate.getFullYear() === year && sessionDate.getMonth() === month) {
        const dateKey = formatDateKey(sessionDate)
        const existing = result.get(dateKey) || []
        result.set(dateKey, [...existing, session])
      }
    })

    return result
  },

  // Удалить сессию
  deleteSession: (sessionId: string) => {
    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== sessionId)
      saveSessionsToStorage(newSessions)
      return { sessions: newSessions }
    })
  },

  // Очистить всю историю
  clearHistory: () => {
    set({ sessions: [] })
    localStorage.removeItem(STORAGE_KEY)
  }
}))

// Вспомогательная функция для форматирования даты в ключ
function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


