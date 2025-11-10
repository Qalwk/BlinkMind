import type { TrackingData, TrackingSettings, CameraStatus } from './tracking.types'

// Типы для Electron API
export interface ElectronAPI {
  // Управление трекингом
  startTracking: (settings: TrackingSettings) => void
  stopTracking: () => void
  updateSettings: (settings: TrackingSettings) => void
  
  // Слушатели событий
  onTrackerData: (callback: (data: TrackingData) => void) => void
  onCameraStatus: (callback: (status: CameraStatus) => void) => void
  onTrackerError: (callback: (error: string) => void) => void
  onVideoFrame: (callback: (imageData: string) => void) => void // НОВОЕ: кадры видео
  
  // Очистка слушателей
  removeTrackerDataListener: () => void
  removeCameraStatusListener: () => void
  removeTrackerErrorListener: () => void
  removeVideoFrameListener: () => void
}

// API для tracker окна
export interface TrackerAPI {
  // НОВОЕ: Сигнал о готовности
  sendReady: () => void
  
  // Отправка данных
  sendTrackerData: (data: TrackingData) => void
  sendCameraStatus: (status: CameraStatus) => void
  sendError: (error: string) => void
  sendVideoFrame: (imageData: string) => void // НОВОЕ: кадры видео
  
  // Получение команд
  onStartTracking: (callback: (settings: TrackingSettings) => void) => void
  onStopTracking: (callback: () => void) => void
  onSettingsUpdate: (callback: (settings: TrackingSettings) => void) => void
}

// Расширение глобального объекта Window
declare global {
  interface Window {
    electronAPI?: ElectronAPI
    trackerAPI?: TrackerAPI
    // MediaPipe глобальные переменные
    FaceMesh?: any
    Camera?: any
  }
}

export {}


