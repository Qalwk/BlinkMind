// Zustand store для управления сессией трекинга

import { create } from 'zustand'
import type { 
  TrackingData, 
  TrackingSession, 
  TrackingSettings,
  SessionMetrics,
  CameraStatus
} from '@/shared/types/tracking.types'
import { DEFAULT_TRACKING_SETTINGS } from '@/shared/types/tracking.types'
import { useSessionHistoryStore } from '@/entities/session-history'

interface TrackingState {
  // Текущая сессия
  currentSession: TrackingSession | null
  isTracking: boolean
  
  // Текущие данные
  latestData: TrackingData | null
  cameraStatus: CameraStatus
  
  // Настройки
  settings: TrackingSettings
  
  // История данных (последние N записей)
  dataHistory: TrackingData[]
  maxHistoryLength: number
  
  // Ошибки
  lastError: string | null
  
  // Действия
  startSession: () => void
  stopSession: () => void
  updateTrackingData: (data: TrackingData) => void
  updateSettings: (settings: Partial<TrackingSettings>) => void
  updateCameraStatus: (status: CameraStatus) => void
  setError: (error: string) => void
  clearError: () => void
  markSessionAsPomodoro: (pomodoroCount?: number) => void
}

export const useTrackingStore = create<TrackingState>((set, get) => ({
  // Начальное состояние
  currentSession: null,
  isTracking: false,
  latestData: null,
  cameraStatus: {
    initialized: false,
    active: false
  },
  settings: DEFAULT_TRACKING_SETTINGS,
  dataHistory: [],
  maxHistoryLength: 1000, // храним последние 1000 записей
  lastError: null,

  // Начать новую сессию
  startSession: () => {
    const now = Date.now()
    const newSession: TrackingSession = {
      id: `session_${now}`,
      startTime: now,
      totalDuration: 0,
      metrics: {
        totalBlinks: 0,
        averageBlinkRate: 0,
        averageEngagement: 0,
        timeFullyEngaged: 0,
        timePartiallyEngaged: 0,
        timeDisengaged: 0,
        timeDistracted: 0,
        timeFocused: 0,
        timeInactive: 0,
        efficiency: 0,
        headPoseStats: {
          averageYaw: 0,
          averagePitch: 0,
          averageRoll: 0
        }
      }
    }

    set({
      currentSession: newSession,
      isTracking: true,
      dataHistory: [],
      lastError: null
    })
  },

  // Остановить сессию
  stopSession: () => {
    const state = get()
    const session = state.currentSession

    if (session) {
      const endTime = Date.now()
      const duration = (endTime - session.startTime) / 1000 // в секундах

      // Вычисление финальных метрик, передаем реальное время сессии
      const metrics = calculateSessionMetrics(state.dataHistory, duration)

      const finishedSession: TrackingSession = {
        ...session,
        endTime,
        totalDuration: duration,
        metrics,
        // ВАЖНО: сохраняем флаги помодоро если они есть
        isPomodoroSession: session.isPomodoroSession,
        pomodoroCount: session.pomodoroCount
      }

      // Сохраняем сессию в историю
      useSessionHistoryStore.getState().addSession(finishedSession)
      console.log('Сессия завершена и сохранена:', finishedSession)
      
      // Логируем если это помодоро-сессия
      if (finishedSession.isPomodoroSession) {
        console.log('✅ Помодоро-сессия сохранена! Завершено помодоро:', finishedSession.pomodoroCount)
      }

      set({
        currentSession: finishedSession,
        isTracking: false
      })
    }
  },

  // Обновить данные трекинга
  updateTrackingData: (data: TrackingData) => {
    const state = get()
    const newHistory = [...state.dataHistory, data]

    // Ограничение размера истории
    if (newHistory.length > state.maxHistoryLength) {
      newHistory.shift()
    }

    set({
      latestData: data,
      dataHistory: newHistory
    })
  },

  // Обновить настройки
  updateSettings: (newSettings: Partial<TrackingSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }))
  },

  // Обновить статус камеры
  updateCameraStatus: (status: CameraStatus) => {
    set({ cameraStatus: status })
  },

  // Установить ошибку
  setError: (error: string) => {
    set({ lastError: error })
  },

  // Очистить ошибку
  clearError: () => {
    set({ lastError: null })
  },

  // Пометить текущую сессию как помодоро-сессию
  markSessionAsPomodoro: (pomodoroCount?: number) => {
    set((state) => {
      if (state.currentSession) {
        return {
          currentSession: {
            ...state.currentSession,
            isPomodoroSession: true,
            pomodoroCount
          }
        }
      }
      return state
    })
  }
}))

// Вычисление метрик сессии на основе истории данных
function calculateSessionMetrics(dataHistory: TrackingData[], totalSessionDuration: number): SessionMetrics {
  if (dataHistory.length === 0) {
    return {
      totalBlinks: 0,
      averageBlinkRate: 0,
      averageEngagement: 0,
      timeFullyEngaged: 0,
      timePartiallyEngaged: 0,
      timeDisengaged: 0,
      timeDistracted: 0,
      timeFocused: 0,
      timeInactive: 0,
      efficiency: 0,
      headPoseStats: {
        averageYaw: 0,
        averagePitch: 0,
        averageRoll: 0
      }
    }
  }

  let totalBlinks = 0
  let totalEngagement = 0
  let timeFullyEngaged = 0
  let timePartiallyEngaged = 0
  let timeDisengaged = 0
  let timeDistracted = 0
  let timeFocused = 0
  let timeInactive = 0
  let totalYaw = 0
  let totalPitch = 0
  let totalRoll = 0

  // Подсчитываем время используя разницу timestamps между кадрами
  for (let i = 0; i < dataHistory.length; i++) {
    const data = dataHistory[i]
    
    totalBlinks = Math.max(totalBlinks, data.blink.blinkCount)
    totalEngagement += data.engagement.level

    // Вычисляем длительность текущего кадра (время до следующего кадра)
    let frameDuration = 1 // по умолчанию 1 секунда если нет следующего кадра
    if (i < dataHistory.length - 1) {
      // Разница в миллисекундах / 1000 = секунды
      frameDuration = (dataHistory[i + 1].timestamp - data.timestamp) / 1000
      // Ограничиваем максимум 5 секундами на случай пропусков
      frameDuration = Math.min(frameDuration, 5)
    }

    // Подсчет ТОЛЬКО времени отвлечения (в секундах)
    // Время фокуса будем вычислять как: общее время - отвлечение
    if (data.engagement.distracted) {
      timeDistracted += frameDuration
      // Если причина - лицо не обнаружено, это инактивность
      if (data.engagement.distractionReason === 'face_not_detected') {
        timeInactive += frameDuration
      }
    }

    // Классификация по уровню вовлеченности (считаем кадры для статистики)
    if (data.engagement.distracted) {
      timeDisengaged++
    } else if (data.engagement.level > 80) {
      timeFullyEngaged++
    } else if (data.engagement.level >= 40) {
      timePartiallyEngaged++
    } else {
      timeDisengaged++
    }

    totalYaw += data.headPose.yaw
    totalPitch += data.headPose.pitch
    totalRoll += data.headPose.roll
  }

  const count = dataHistory.length
  
  // Фокус = общее время сессии минус отвлечение
  const actualFocusTime = Math.max(0, totalSessionDuration - timeDistracted)
  
  // Расчет эффективности: (общее время - отвлечения) / общее время * 100
  const efficiency = totalSessionDuration > 0 ? (actualFocusTime / totalSessionDuration) * 100 : 0
  
  // Расчет среднего количества морганий в минуту: (общее количество / время в секундах) * 60
  const averageBlinkRate = totalSessionDuration > 0 ? (totalBlinks / totalSessionDuration) * 60 : 0

  return {
    totalBlinks,
    averageBlinkRate,
    averageEngagement: totalEngagement / count,
    timeFullyEngaged,
    timePartiallyEngaged,
    timeDisengaged,
    timeDistracted, // Время когда НЕ смотрел в экран (в секундах)
    timeFocused: actualFocusTime, // Общее время сессии - отвлечения (в секундах)
    timeInactive,
    efficiency,
    headPoseStats: {
      averageYaw: totalYaw / count,
      averagePitch: totalPitch / count,
      averageRoll: totalRoll / count
    }
  }
}


