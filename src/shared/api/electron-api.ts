// Безопасная обертка для Electron API

import type { ElectronAPI, TrackerAPI } from '../types/electron.types'

// Проверка доступности Electron API
export function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI
}

export function isTrackerAPIAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.trackerAPI
}

// Получение API с проверкой
export function getElectronAPI(): ElectronAPI {
  if (!isElectronAvailable()) {
    throw new Error('Electron API недоступен. Приложение должно запускаться в Electron.')
  }
  return window.electronAPI!
}

export function getTrackerAPI(): TrackerAPI {
  if (!isTrackerAPIAvailable()) {
    console.warn('[Tracker] API недоступен, использую mock')
    return createMockTrackerAPI()
  }
  return window.trackerAPI!
}

// Моки для разработки в браузере
export function createMockElectronAPI(): ElectronAPI {
  return {
    startTracking: (settings) => {
      console.log('[Mock] Start tracking:', settings)
    },
    stopTracking: () => {
      console.log('[Mock] Stop tracking')
    },
    updateSettings: (settings) => {
      console.log('[Mock] Update settings:', settings)
    },
    onTrackerData: (callback) => {
      console.log('[Mock] Registered tracker data listener')
    },
    onCameraStatus: (callback) => {
      console.log('[Mock] Registered camera status listener')
    },
    onTrackerError: (callback) => {
      console.log('[Mock] Registered tracker error listener')
    },
    onVideoFrame: (callback) => {
      console.log('[Mock] Registered video frame listener')
    },
    removeTrackerDataListener: () => {
      console.log('[Mock] Removed tracker data listener')
    },
    removeCameraStatusListener: () => {
      console.log('[Mock] Removed camera status listener')
    },
    removeTrackerErrorListener: () => {
      console.log('[Mock] Removed tracker error listener')
    },
    removeVideoFrameListener: () => {
      console.log('[Mock] Removed video frame listener')
    }
  }
}

// Mock для Tracker API
export function createMockTrackerAPI(): TrackerAPI {
  return {
    sendReady: () => {
      console.log('[Mock Tracker] Send ready signal')
    },
    sendTrackerData: (data) => {
      console.log('[Mock Tracker] Send tracking data:', data)
    },
    sendCameraStatus: (status) => {
      console.log('[Mock Tracker] Send camera status:', status)
    },
    sendError: (error) => {
      console.error('[Mock Tracker] Send error:', error)
    },
    onStartTracking: (callback) => {
      console.log('[Mock Tracker] Registered start tracking listener')
    },
    onStopTracking: (callback) => {
      console.log('[Mock Tracker] Registered stop tracking listener')
    },
    onSettingsUpdate: (callback) => {
      console.log('[Mock Tracker] Registered settings update listener')
    },
    sendVideoFrame: (imageData) => {
      console.log('[Mock Tracker] Send video frame')
    }
  }
}


