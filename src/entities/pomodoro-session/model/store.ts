// Zustand store для управления помодоро сессиями с таймером и историей

import { create } from 'zustand'
import type {
  PomodoroSettings,
  PomodoroTimerState,
  CompletedPomodoro,
  DailyPomodoroStats,
  StreakStats,
  PomodoroIntervalType,
  PomodoroStatus
} from '@/shared/types/pomodoro.types'
import { DEFAULT_POMODORO_SETTINGS } from '@/shared/types/pomodoro.types'
import { useTrackingStore } from '@/entities/tracking-session'

interface PomodoroState {
  // Настройки
  settings: PomodoroSettings
  
  // Состояние таймера
  timer: PomodoroTimerState
  
  // История завершенных помодоро
  history: CompletedPomodoro[]
  
  // Статистика стрика
  streakStats: StreakStats
  
  // Интервал для тика таймера
  timerInterval: number | null
  
  // Действия для настроек
  updateSettings: (settings: Partial<PomodoroSettings>) => void
  
  // Действия для таймера
  startTimer: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  skipInterval: () => void
  
  // Действия для истории
  getHistoryByDate: (date: string) => CompletedPomodoro[]
  getDailyStats: (date: string) => DailyPomodoroStats
  getTodayStats: () => DailyPomodoroStats
  clearHistory: () => void
  
  // Внутренние действия
  tick: () => void
  completeInterval: () => void
  startNextInterval: () => void
  updateStreakStats: () => void
}

const STORAGE_KEY_SETTINGS = 'blinkmind_pomodoro_settings'
const STORAGE_KEY_HISTORY = 'blinkmind_pomodoro_history'
const STORAGE_KEY_STREAK = 'blinkmind_pomodoro_streak'

// Загрузка из localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error(`Ошибка при загрузке ${key}:`, error)
  }
  return defaultValue
}

// Сохранение в localStorage
function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Ошибка при сохранении ${key}:`, error)
  }
}

// Получение текущей даты в формате YYYY-MM-DD
function getTodayDateString(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Начальное состояние таймера
const initialTimerState: PomodoroTimerState = {
  status: 'idle',
  currentInterval: 'work',
  remainingTime: 0,
  totalTime: 0,
  completedPomodoros: 0
}

// Начальная статистика стрика
const initialStreakStats: StreakStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: ''
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  // Начальное состояние
  settings: loadFromStorage(STORAGE_KEY_SETTINGS, DEFAULT_POMODORO_SETTINGS),
  timer: initialTimerState,
  history: loadFromStorage(STORAGE_KEY_HISTORY, []),
  streakStats: loadFromStorage(STORAGE_KEY_STREAK, initialStreakStats),
  timerInterval: null,
  
  // Обновить настройки
  updateSettings: (newSettings: Partial<PomodoroSettings>) => {
    set((state) => {
      const updatedSettings = { ...state.settings, ...newSettings }
      saveToStorage(STORAGE_KEY_SETTINGS, updatedSettings)
      return { settings: updatedSettings }
    })
  },
  
  // Начать таймер
  startTimer: () => {
    const state = get()
    const { settings, timer } = state
    
    // Определяем длительность интервала
    let duration: number
    if (timer.currentInterval === 'work') {
      duration = settings.workDuration * 60
    } else if (timer.currentInterval === 'short-break') {
      duration = settings.shortBreakDuration * 60
    } else {
      duration = settings.longBreakDuration * 60
    }
    
    // Запускаем таймер
    const interval = window.setInterval(() => {
      get().tick()
    }, 1000)
    
    set({
      timer: {
        ...timer,
        status: 'running',
        remainingTime: duration,
        totalTime: duration
      },
      timerInterval: interval
    })
  },
  
  // Пауза
  pauseTimer: () => {
    const state = get()
    if (state.timerInterval) {
      clearInterval(state.timerInterval)
    }
    
    set((state) => ({
      timer: { ...state.timer, status: 'paused' },
      timerInterval: null
    }))
  },
  
  // Продолжить
  resumeTimer: () => {
    const state = get()
    
    const interval = window.setInterval(() => {
      get().tick()
    }, 1000)
    
    set((state) => ({
      timer: { ...state.timer, status: 'running' },
      timerInterval: interval
    }))
  },
  
  // Остановить (сбросить)
  stopTimer: () => {
    const state = get()
    if (state.timerInterval) {
      clearInterval(state.timerInterval)
    }
    
    // Если был запущен помодоро, сохраняем как незавершенный
    if (state.timer.status === 'running' || state.timer.status === 'paused') {
      const now = Date.now()
      const elapsed = state.timer.totalTime - state.timer.remainingTime
      
      const incompletePomodoro: CompletedPomodoro = {
        id: `pomodoro_${now}`,
        startTime: now - elapsed * 1000,
        endTime: now,
        duration: elapsed,
        intervalType: state.timer.currentInterval,
        completed: false,
        date: getTodayDateString()
      }
      
      const newHistory = [...state.history, incompletePomodoro]
      saveToStorage(STORAGE_KEY_HISTORY, newHistory)
      
      set({
        history: newHistory
      })
    }
    
    set({
      timer: {
        ...initialTimerState,
        currentInterval: 'work',
        completedPomodoros: 0
      },
      timerInterval: null
    })
  },
  
  // Пропустить интервал
  skipInterval: () => {
    const state = get()
    if (state.timerInterval) {
      clearInterval(state.timerInterval)
    }
    
    get().startNextInterval()
  },
  
  // Тик таймера
  tick: () => {
    const state = get()
    const newRemainingTime = state.timer.remainingTime - 1
    
    if (newRemainingTime <= 0) {
      get().completeInterval()
    } else {
      set((state) => ({
        timer: { ...state.timer, remainingTime: newRemainingTime }
      }))
    }
  },
  
  // Завершить интервал
  completeInterval: () => {
    const state = get()
    
    if (state.timerInterval) {
      clearInterval(state.timerInterval)
    }
    
    const now = Date.now()
    const elapsed = state.timer.totalTime
    const isWorkInterval = state.timer.currentInterval === 'work'
    
    // Сохраняем завершенный помодоро
    const completedPomodoro: CompletedPomodoro = {
      id: `pomodoro_${now}`,
      startTime: now - elapsed * 1000,
      endTime: now,
      duration: elapsed,
      intervalType: state.timer.currentInterval,
      completed: true,
      date: getTodayDateString()
    }
    
    const newHistory = [...state.history, completedPomodoro]
    saveToStorage(STORAGE_KEY_HISTORY, newHistory)
    
    // Обновляем счетчик завершенных помодоро
    let newCompletedCount = state.timer.completedPomodoros
    if (isWorkInterval) {
      newCompletedCount++
      get().updateStreakStats()
    }
    
    // Звуковое уведомление
    if (state.settings.soundEnabled) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjWH0fPTgjMGHWu99eikUAwfWKrn66JUIww/ltvyxHUlBSt+zPLaizsIHGe9+vOoVRQSUqvm8bBlEgU7k9n43JY8CRxivf32rVoYEkys5PKsZRYJPJPY9tqNOwoZaMD68bVrHAU+k9n03I4+Ch1gvf32pVobEVCr5O+tYxkOPpHX9dqOPgoaZ77+9KVaGxJQqeTtsWYaDz+Q2fXajkAKHGS9/vSmWBkST6jj7axgGg44jtn1248/ChtnwP73olQZEU+m4+Tit2IeDT2O1vPYijoIGWe79/CgUhoRUKvj67RnHg0+jtb03Iw9Ch1jwf/1oVMZE1Gq4+yqXxcLQJHY8t2NPwoaZsD892FTGhNRquTutWYaDz2O1vPXjT8KHWPA//aiUxoSUKjj7KtgGQ4/kdnz2ow+Ch1jwf/2oVMZE1Gq4+ypXxgMQJDY8t2NPwoaZsD69qJVGhNQqOPsqmAZDj+R2fPajD4KHWLBAPhgUxsTT6rm77BkGg8+j9bz1o0/Ch1jv//0o1QaElCp5O2rYBkOP4/Y8tyMPAkdY8D/96FTGRNRquPsqF8YDECNzfTej7wI') 
      audio.volume = 0.3
      audio.play().catch(() => {})
    }
    
    console.log(`🎯 Интервал завершен: ${state.timer.currentInterval}, счетчик помодоро: ${newCompletedCount}`)
    
    // ВАЖНО: Если завершился РАБОЧИЙ интервал - останавливаем и сохраняем трекинг-сессию
    if (isWorkInterval) {
      console.log('✅ Рабочий помодоро завершен! Сохраняем трекинг-сессию...')
      
      const trackingStore = useTrackingStore.getState()
      
      // Помечаем сессию как помодоро с количеством завершенных
      if (trackingStore.markSessionAsPomodoro) {
        trackingStore.markSessionAsPomodoro(newCompletedCount)
      }
      
      // Останавливаем трекинг-сессию (это сохранит ее в историю)
      if (trackingStore.isTracking && trackingStore.stopSession) {
        trackingStore.stopSession()
        console.log('💾 Трекинг-сессия остановлена и сохранена в календарь')
      }
    }
    
    set({
      timer: {
        ...state.timer,
        status: 'completed',
        remainingTime: 0,
        completedPomodoros: newCompletedCount
      },
      timerInterval: null,
      history: newHistory
    })
    
    // Автоматически начинаем следующий интервал если включено
    const shouldAutoStart = 
      (state.timer.currentInterval === 'work' && state.settings.autoStartBreaks) ||
      (state.timer.currentInterval !== 'work' && state.settings.autoStartPomodoros)
    
    if (shouldAutoStart) {
      setTimeout(() => {
        get().startNextInterval()
        get().startTimer()
      }, 2000)
    }
  },
  
  // Начать следующий интервал
  startNextInterval: () => {
    const state = get()
    const { timer, settings } = state
    
    let nextInterval: PomodoroIntervalType
    
    if (timer.currentInterval === 'work') {
      // После работы - перерыв
      if (timer.completedPomodoros >= settings.longBreakInterval) {
        nextInterval = 'long-break'
      } else {
        nextInterval = 'short-break'
      }
    } else {
      // После перерыва - работа
      nextInterval = 'work'
      // Сбрасываем счетчик после длинного перерыва
      if (timer.currentInterval === 'long-break') {
        set((state) => ({
          timer: { ...state.timer, completedPomodoros: 0 }
        }))
      }
    }
    
    set((state) => ({
      timer: {
        ...state.timer,
        currentInterval: nextInterval,
        status: 'idle',
        remainingTime: 0,
        totalTime: 0
      }
    }))
  },
  
  // Обновить статистику стрика
  updateStreakStats: () => {
    const today = getTodayDateString()
    const state = get()
    const streakStats = { ...state.streakStats }
    
    // Если это первое помодоро за сегодня
    if (streakStats.lastActivityDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = getTodayDateString()
      
      // Проверяем был ли вчера активен
      if (streakStats.lastActivityDate === yesterdayString) {
        // Продолжаем стрик
        streakStats.currentStreak++
      } else {
        // Начинаем новый стрик
        streakStats.currentStreak = 1
      }
      
      // Обновляем рекорд
      if (streakStats.currentStreak > streakStats.longestStreak) {
        streakStats.longestStreak = streakStats.currentStreak
      }
      
      streakStats.lastActivityDate = today
      
      saveToStorage(STORAGE_KEY_STREAK, streakStats)
      set({ streakStats })
    }
  },
  
  // Получить историю за дату
  getHistoryByDate: (date: string) => {
    const state = get()
    return state.history.filter((p) => p.date === date)
  },
  
  // Получить статистику за день
  getDailyStats: (date: string) => {
    const state = get()
    const pomodoros = state.history.filter((p) => p.date === date)
    
    const completedPomodoros = pomodoros.filter(
      (p) => p.completed && p.intervalType === 'work'
    ).length
    
    const totalWorkTime = pomodoros
      .filter((p) => p.intervalType === 'work')
      .reduce((sum, p) => sum + p.duration, 0)
    
    const totalBreakTime = pomodoros
      .filter((p) => p.intervalType !== 'work')
      .reduce((sum, p) => sum + p.duration, 0)
    
    return {
      date,
      completedPomodoros,
      totalWorkTime,
      totalBreakTime,
      pomodoros
    }
  },
  
  // Получить статистику за сегодня
  getTodayStats: () => {
    return get().getDailyStats(getTodayDateString())
  },
  
  // Очистить историю
  clearHistory: () => {
    set({ 
      history: [],
      streakStats: initialStreakStats
    })
    localStorage.removeItem(STORAGE_KEY_HISTORY)
    localStorage.removeItem(STORAGE_KEY_STREAK)
  }
}))

