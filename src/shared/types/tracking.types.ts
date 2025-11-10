// Типы для системы трекинга

// Данные о моргании
export interface BlinkData {
  timestamp: number
  blinkDetected: boolean
  eyeAspectRatio: number
  blinkCount: number
  averageBlinkRate: number // морганий в минуту
}

// Данные о позе головы (углы Эйлера в градусах)
export interface HeadPoseData {
  timestamp: number
  yaw: number // поворот влево/вправо (-90 до 90)
  pitch: number // наклон вверх/вниз (-90 до 90)
  roll: number // наклон головы (-90 до 90)
}

// Уровень вовлеченности (0-100)
export interface EngagementData {
  timestamp: number
  level: number // 0-100
  faceCentered: boolean
  lookingAtScreen: boolean
  distracted: boolean // true если пользователь отвлечен (не смотрит на экран/отвернулся/нет лица)
  distractionReason?: 'face_not_detected' | 'looking_away' | 'head_turned' // причина отвлечения
}

// Координаты ключевых точек лица (для HUD)
export interface FaceLandmarksData {
  // Координаты в относительных единицах (0-1) от размера canvas
  leftEye: { x: number; y: number }
  rightEye: { x: number; y: number }
  mouth: { x: number; y: number; width: number; height: number }
}

// Комплексные данные трекинга
export interface TrackingData {
  timestamp: number
  blink: BlinkData
  headPose: HeadPoseData
  engagement: EngagementData
  faceDetected: boolean
  faceLandmarks?: FaceLandmarksData // Опционально - только если лицо обнаружено
}

// Настройки трекинга
export interface TrackingSettings {
  blinkThreshold: number // порог EAR для определения моргания
  
  // Пороги для определения направления взгляда
  engagementYawThreshold: number // порог угла yaw (поворот головы влево/вправо) в градусах
  engagementPitchUpThreshold: number // порог угла pitch вверх (смотрит выше экрана) в градусах
  engagementPitchDownThreshold: number // порог угла pitch вниз (смотрит ниже экрана) в градусах
  
  fpsBackground: number // FPS в фоновом режиме
  fpsActive: number // FPS в активном режиме
  cameraEnabled: boolean
  showBlinkFlash: boolean // показывать желтый фон при моргании
}

// Статус камеры
export interface CameraStatus {
  initialized: boolean
  active: boolean
  error?: string
  deviceId?: string
  deviceLabel?: string
}

// Сессия трекинга
export interface TrackingSession {
  id: string
  startTime: number
  endTime?: number
  totalDuration: number // в секундах
  metrics: SessionMetrics
  isPomodoroSession?: boolean // флаг что это помодоро-сессия
  pomodoroCount?: number // количество завершенных помодоро в этой сессии
}

// Метрики сессии
export interface SessionMetrics {
  totalBlinks: number
  averageBlinkRate: number
  averageEngagement: number
  timeFullyEngaged: number // количество кадров с engagement > 80
  timePartiallyEngaged: number // количество кадров с engagement 40-80
  timeDisengaged: number // количество кадров с engagement < 40
  timeDistracted: number // СЕКУНДЫ отвлечения (реальное время)
  timeFocused: number // СЕКУНДЫ фокуса на экране (реальное время, не отвлечен)
  timeInactive: number // СЕКУНДЫ инактивности (реальное время, лицо не в кадре)
  efficiency: number // процент эффективности (timeFocused / totalTime * 100)
  headPoseStats: {
    averageYaw: number
    averagePitch: number
    averageRoll: number
  }
}

// Настройки по умолчанию
export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  blinkThreshold: 0.2,
  engagementYawThreshold: 30, // 30 градусов влево/вправо
  engagementPitchUpThreshold: 20, // 20 градусов вверх (чтобы не считать смотрящим в камеру)
  engagementPitchDownThreshold: 25, // 25 градусов вниз (смотрит на монитор чуть ниже камеры - норма)
  fpsBackground: 15,
  fpsActive: 30,
  cameraEnabled: true,
  showBlinkFlash: true // по умолчанию показываем
}


