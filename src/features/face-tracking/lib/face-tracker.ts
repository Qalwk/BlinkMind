// Сервис трекинга лица с использованием MediaPipe Face Mesh

import type { 
  TrackingData, 
  BlinkData, 
  HeadPoseData, 
  EngagementData,
  TrackingSettings,
  CameraStatus,
  FaceLandmarksData
} from '@/shared/types/tracking.types'

// Типы для MediaPipe (упрощенные, без полного импорта)
interface FaceLandmark {
  x: number
  y: number
  z: number
}

interface FaceMeshResults {
  multiFaceLandmarks?: FaceLandmark[][]
  image: HTMLVideoElement | HTMLCanvasElement
}

export class FaceTracker {
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private faceMesh: any = null // MediaPipe FaceMesh instance
  private camera: any = null // MediaPipe Camera instance
  private isRunning: boolean = false
  private settings: TrackingSettings
  
  // Статистика для анализа
  private blinkCount: number = 0
  private blinkHistory: number[] = [] // timestamps морганий
  private lastBlinkTime: number = 0
  private previousEAR: number = 0.3
  
  // Таймер для периодической отправки данных (даже без результатов)
  private dataInterval: number | null = null
  private lastDataSentTime: number = 0
  
  // Коллбэки
  private onDataCallback?: (data: TrackingData) => void
  private onStatusCallback?: (status: CameraStatus) => void
  private onErrorCallback?: (error: string) => void

  constructor(settings: TrackingSettings) {
    this.settings = settings
  }

  // Инициализация камеры и MediaPipe
  async initialize(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    try {
      this.videoElement = videoElement
      this.canvasElement = canvasElement

      // Загрузка MediaPipe Face Mesh
      // @ts-ignore - MediaPipe глобальные переменные
      const { FaceMesh } = window
      // @ts-ignore
      const { Camera } = window

      if (!FaceMesh) {
        throw new Error('MediaPipe Face Mesh не загружен. Проверьте подключение библиотеки.')
      }

      // Создание Face Mesh instance
      // Используем unpkg.com как альтернативу jsdelivr
      this.faceMesh = new FaceMesh({
        locateFile: (file: string) => {
          return `https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619/${file}`
        }
      })

      // Настройки Face Mesh
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      })

      // Установка коллбэка для результатов
      this.faceMesh.onResults((results: FaceMeshResults) => {
        this.processResults(results)
      })

      // Инициализация камеры
      this.camera = new Camera(this.videoElement, {
        onFrame: async () => {
          if (this.isRunning && this.faceMesh) {
            try {
              await this.faceMesh.send({ image: this.videoElement })
            } catch (error) {
              console.error('[FaceTracker] Ошибка обработки кадра:', error)
            }
          }
        },
        width: 640,
        height: 480
      })
      
      console.log('[FaceTracker] Camera instance создан')

      this.sendStatus({
        initialized: true,
        active: false
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      this.sendError(`Ошибка инициализации: ${errorMessage}`)
      throw error
    }
  }

  // Запуск трекинга
  async start(): Promise<void> {
    if (!this.camera) {
      throw new Error('Tracker не инициализирован. Вызовите initialize() сначала.')
    }

    try {
      console.log('[FaceTracker] Запуск камеры...')
      this.isRunning = true
      
      // Запускаем камеру
      await this.camera.start()
      console.log('[FaceTracker] ✅ Камера запущена успешно')
      
      // КРИТИЧНО: Отправляем статус что камера активна
      this.sendStatus({
        initialized: true,
        active: true
      })
      
      console.log('[FaceTracker] Статус камеры отправлен: active=true')
      
      // Запускаем периодическую отправку данных (каждую секунду)
      // Это гарантирует что UI видит что трекинг работает
      this.dataInterval = setInterval(() => {
        const timeSinceLastData = Date.now() - this.lastDataSentTime
        // Если данных не было 2 секунды - отправляем "нет лица" (пользователь отвлечен)
        if (timeSinceLastData > 2000 && this.isRunning) {
          console.log('[FaceTracker] Периодическая отправка данных (нет результатов)')
          const emptyData: TrackingData = {
            timestamp: Date.now(),
            faceDetected: false,
            blink: this.getDefaultBlinkData(Date.now()),
            headPose: this.getDefaultHeadPoseData(Date.now()),
            engagement: {
              timestamp: Date.now(),
              level: 0,
              faceCentered: false,
              lookingAtScreen: false,
              distracted: true,
              distractionReason: 'face_not_detected'
            }
          }
          this.sendData(emptyData)
        }
      }, 1000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      console.error('[FaceTracker] ❌ Ошибка запуска камеры:', errorMessage)
      this.isRunning = false
      
      // Отправляем статус с ошибкой
      this.sendStatus({
        initialized: true,
        active: false,
        error: errorMessage
      })
      this.sendError(`Ошибка запуска камеры: ${errorMessage}`)
      throw error
    }
  }

  // Остановка трекинга
  stop(): void {
    this.isRunning = false
    
    // Останавливаем периодическую отправку
    if (this.dataInterval) {
      clearInterval(this.dataInterval)
      this.dataInterval = null
    }
    
    if (this.camera) {
      this.camera.stop()
    }
    
    this.sendStatus({
      initialized: true,
      active: false
    })
    
    console.log('[FaceTracker] Трекинг остановлен')
  }

  // Обновление настроек
  updateSettings(settings: Partial<TrackingSettings>): void {
    this.settings = { ...this.settings, ...settings }
  }

  // Обработка результатов MediaPipe
  private processResults(results: FaceMeshResults): void {
    const timestamp = Date.now()
    
      // ВАЖНО: Отправляем данные ВСЕГДА, даже если лицо не обнаружено
      // Это позволяет UI видеть что трекинг работает
    
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // Лицо не обнаружено - пользователь отвлечен
      const data: TrackingData = {
        timestamp,
        faceDetected: false,
        blink: this.getDefaultBlinkData(timestamp),
        headPose: this.getDefaultHeadPoseData(timestamp),
        engagement: {
          timestamp,
          level: 0,
          faceCentered: false,
          lookingAtScreen: false,
          distracted: true,
          distractionReason: 'face_not_detected'
        }
      }
      this.sendData(data)
      this.lastDataSentTime = timestamp
      return
    }

    const landmarks = results.multiFaceLandmarks[0]
    
    // Анализ морганий
    const blinkData = this.analyzeBlinking(landmarks, timestamp)
    
    // Анализ позы головы
    const headPoseData = this.analyzeHeadPose(landmarks, timestamp)
    
    // Анализ вовлеченности
    const engagementData = this.analyzeEngagement(
      landmarks, 
      headPoseData, 
      blinkData, 
      timestamp
    )

    // Извлечение координат ключевых точек для HUD
    const faceLandmarks = this.extractFaceLandmarks(landmarks)

    const data: TrackingData = {
      timestamp,
      faceDetected: true,
      blink: blinkData,
      headPose: headPoseData,
      engagement: engagementData,
      faceLandmarks
    }

    this.sendData(data)
    this.lastDataSentTime = Date.now()
  }

  // Извлечение координат глаз и рта для HUD
  private extractFaceLandmarks(landmarks: FaceLandmark[]): FaceLandmarksData {
    // Индексы ключевых точек MediaPipe Face Mesh:
    // Левый глаз: центр между точками 33 и 133
    // Правый глаз: центр между точками 362 и 263
    // Рот: верх 13, низ 14, левый угол 61, правый угол 291
    
    const leftEyeCenter = {
      x: (landmarks[33].x + landmarks[133].x) / 2,
      y: (landmarks[33].y + landmarks[133].y) / 2
    }
    
    const rightEyeCenter = {
      x: (landmarks[362].x + landmarks[263].x) / 2,
      y: (landmarks[362].y + landmarks[263].y) / 2
    }
    
    // Рот - берем углы рта и центр
    const mouthLeft = landmarks[61]
    const mouthRight = landmarks[291]
    const mouthTop = landmarks[13]
    const mouthBottom = landmarks[14]
    
    const mouthCenter = {
      x: (mouthLeft.x + mouthRight.x) / 2,
      y: (mouthTop.y + mouthBottom.y) / 2
    }
    
    const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x)
    const mouthHeight = Math.abs(mouthBottom.y - mouthTop.y)
    
    return {
      leftEye: leftEyeCenter,
      rightEye: rightEyeCenter,
      mouth: {
        x: mouthCenter.x,
        y: mouthCenter.y,
        width: mouthWidth,
        height: mouthHeight
      }
    }
  }

  // Анализ морганий на основе Eye Aspect Ratio (EAR)
  private analyzeBlinking(landmarks: FaceLandmark[], timestamp: number): BlinkData {
    // Ключевые точки для глаз (индексы для MediaPipe Face Mesh)
    // Правый глаз: 33, 160, 158, 133, 153, 144
    // Левый глаз: 362, 385, 387, 263, 373, 380
    
    const rightEAR = this.calculateEyeAspectRatio(
      landmarks[33], landmarks[160], landmarks[158],
      landmarks[133], landmarks[153], landmarks[144]
    )
    
    const leftEAR = this.calculateEyeAspectRatio(
      landmarks[362], landmarks[385], landmarks[387],
      landmarks[263], landmarks[373], landmarks[380]
    )
    
    // Средний EAR для обоих глаз
    const avgEAR = (rightEAR + leftEAR) / 2
    
    // Определение моргания
    const blinkDetected = avgEAR < this.settings.blinkThreshold
    
    if (blinkDetected && this.previousEAR >= this.settings.blinkThreshold) {
      // Новое моргание
      this.blinkCount++
      this.blinkHistory.push(timestamp)
      this.lastBlinkTime = timestamp
      
      // Очистка старой истории (старше 1 минуты)
      this.blinkHistory = this.blinkHistory.filter(t => timestamp - t < 60000)
    }
    
    this.previousEAR = avgEAR
    
    // Расчет частоты морганий в минуту
    let blinkRate = 0
    if (this.blinkHistory.length > 0) {
      // Время от первого моргания до текущего момента (в секундах)
      const timeSpan = (timestamp - this.blinkHistory[0]) / 1000
      
      if (timeSpan >= 60) {
        // Прошла хотя бы минута - считаем точно
        blinkRate = this.blinkHistory.length
      } else if (timeSpan > 0) {
        // Прошло меньше минуты - экстраполируем на 60 секунд
        blinkRate = Math.round((this.blinkHistory.length / timeSpan) * 60)
      }
    }

    return {
      timestamp,
      blinkDetected,
      eyeAspectRatio: avgEAR,
      blinkCount: this.blinkCount,
      averageBlinkRate: blinkRate
    }
  }

  // Расчет Eye Aspect Ratio
  private calculateEyeAspectRatio(
    p1: FaceLandmark, p2: FaceLandmark, p3: FaceLandmark,
    p4: FaceLandmark, p5: FaceLandmark, p6: FaceLandmark
  ): number {
    // Вертикальные расстояния
    const vertical1 = this.euclideanDistance(p2, p6)
    const vertical2 = this.euclideanDistance(p3, p5)
    
    // Горизонтальное расстояние
    const horizontal = this.euclideanDistance(p1, p4)
    
    // EAR формула
    const ear = (vertical1 + vertical2) / (2.0 * horizontal)
    
    return ear
  }

  // Евклидово расстояние между точками
  private euclideanDistance(p1: FaceLandmark, p2: FaceLandmark): number {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    const dz = p1.z - p2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  // Анализ позы головы
  private analyzeHeadPose(landmarks: FaceLandmark[], timestamp: number): HeadPoseData {
    // Ключевые точки для определения позы головы
    // Нос: 1, Лоб: 10, Подбородок: 152
    // Левый глаз внутренний: 133, Правый глаз внутренний: 362
    // Левое ухо: 234, Правое ухо: 454
    
    const nose = landmarks[1]
    const forehead = landmarks[10]
    const chin = landmarks[152]
    const leftEyeInner = landmarks[133]
    const rightEyeInner = landmarks[362]
    
    // YAW (поворот головы влево/вправо)
    // Вычисляем на основе расстояния между внутренними уголками глаз и носом
    const eyeCenter = {
      x: (leftEyeInner.x + rightEyeInner.x) / 2,
      y: (leftEyeInner.y + rightEyeInner.y) / 2
    }
    
    // Расстояние от носа до центра между глазами (нормализованное)
    const noseToEyeCenter = nose.x - eyeCenter.x
    
    // Расстояние между глазами для нормализации
    const eyeDistance = Math.abs(rightEyeInner.x - leftEyeInner.x)
    
    // Yaw: отрицательный = поворот влево, положительный = поворот вправо
    // Нормализуем по расстоянию между глазами и масштабируем в градусы
    const yaw = (noseToEyeCenter / eyeDistance) * 60  // ~60 градусов при максимальном повороте
    
    // PITCH (наклон головы вверх/вниз)
    // Вычисляем на основе вертикального положения носа относительно линии глаз-подбородок
    const faceHeight = Math.abs(chin.y - eyeCenter.y)
    const noseVerticalPosition = (nose.y - eyeCenter.y) / faceHeight
    
    // Pitch: положительный = вниз, отрицательный = вверх
    // Когда голова прямо, нос примерно на 40% от линии глаз до подбородка
    const pitch = (noseVerticalPosition - 0.4) * 90
    
    // ROLL (наклон головы влево/вправо)
    // Вычисляем угол наклона линии глаз
    const roll = Math.atan2(rightEyeInner.y - leftEyeInner.y, rightEyeInner.x - leftEyeInner.x) * (180 / Math.PI)
    
    const result = {
      timestamp,
      yaw: Math.max(-90, Math.min(90, yaw)),
      pitch: Math.max(-90, Math.min(90, pitch)),
      roll: Math.max(-90, Math.min(90, roll))
    }
    
    // Отладочный вывод (каждую секунду)
    if (timestamp % 1000 < 100) {
      console.log('[HeadPose]', 
        `Yaw: ${result.yaw.toFixed(1)}°`, 
        `Pitch: ${result.pitch.toFixed(1)}°`, 
        `Roll: ${result.roll.toFixed(1)}°`
      )
    }
    
    return result
  }

  // Анализ вовлеченности
  private analyzeEngagement(
    landmarks: FaceLandmark[],
    headPose: HeadPoseData,
    blink: BlinkData,
    timestamp: number
  ): EngagementData {
    // Лицо по центру: проверяем положение носа
    const nose = landmarks[1]
    const faceCentered = nose.x > 0.3 && nose.x < 0.7 && nose.y > 0.3 && nose.y < 0.7
    
    // Проверка отвлечения по углам головы
    const headTurnedAway = Math.abs(headPose.yaw) > this.settings.engagementYawThreshold
    const lookingUp = headPose.pitch < -this.settings.engagementPitchUpThreshold
    const lookingDown = headPose.pitch > this.settings.engagementPitchDownThreshold
    
    // Взгляд на экран: голова в нормальном положении
    const lookingAtScreen = !headTurnedAway && !lookingUp && !lookingDown
    
    // Определение отвлечения
    let distracted = false
    let distractionReason: 'face_not_detected' | 'looking_away' | 'head_turned' | undefined
    
    if (headTurnedAway) {
      distracted = true
      distractionReason = 'head_turned'
    } else if (lookingUp || lookingDown) {
      distracted = true
      distractionReason = 'looking_away'
    }
    
    // Расчет уровня вовлеченности (0-100)
    let level = 0
    
    // КРИТИЧНО: Если отвлечен - вовлеченность = 0
    if (distracted) {
      level = 0
    } else {
      // Нормальный расчет вовлеченности
      if (faceCentered) level += 40
      if (lookingAtScreen) level += 40
      if (blink.averageBlinkRate > 10 && blink.averageBlinkRate < 30) level += 20 // нормальная частота морганий
    }
    
    return {
      timestamp,
      level,
      faceCentered,
      lookingAtScreen,
      distracted,
      distractionReason
    }
  }

  // Данные по умолчанию
  private getDefaultBlinkData(timestamp: number): BlinkData {
    return {
      timestamp,
      blinkDetected: false,
      eyeAspectRatio: 0,
      blinkCount: this.blinkCount,
      averageBlinkRate: 0
    }
  }

  private getDefaultHeadPoseData(timestamp: number): HeadPoseData {
    return {
      timestamp,
      yaw: 0,
      pitch: 0,
      roll: 0
    }
  }

  // Коллбэки
  setOnDataCallback(callback: (data: TrackingData) => void): void {
    this.onDataCallback = callback
  }

  setOnStatusCallback(callback: (status: CameraStatus) => void): void {
    this.onStatusCallback = callback
  }

  setOnErrorCallback(callback: (error: string) => void): void {
    this.onErrorCallback = callback
  }

  private sendData(data: TrackingData): void {
    if (this.onDataCallback) {
      this.onDataCallback(data)
    }
  }

  private sendStatus(status: CameraStatus): void {
    if (this.onStatusCallback) {
      this.onStatusCallback(status)
    }
  }

  private sendError(error: string): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error)
    }
  }
}


