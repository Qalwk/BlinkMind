// Виджет отображения потока камеры и визуализации трекинга

import { useEffect, useRef, useState } from 'react'
import { useTrackingStore } from '@/entities/tracking-session'
import { useElectronIntegration } from '@/app/providers/useElectronIntegration'
import './CameraStream.css'

export function CameraStream() {
  const latestData = useTrackingStore((state) => state.latestData)
  const cameraStatus = useTrackingStore((state) => state.cameraStatus)
  const isTracking = useTrackingStore((state) => state.isTracking)
  const settings = useTrackingStore((state) => state.settings)
  const updateSettings = useTrackingStore((state) => state.updateSettings)
  const { requestCameraAccess } = useElectronIntegration()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isRequestingCamera, setIsRequestingCamera] = useState(false)
  const videoFrameImage = useRef<HTMLImageElement | null>(null)
  
  const handleBlinkFlashToggle = () => {
    updateSettings({ showBlinkFlash: !settings.showBlinkFlash })
  }

  // Подписка на кадры видео от tracker окна
  useEffect(() => {
    const handleVideoFrame = (event: CustomEvent<string>) => {
      const imageData = event.detail
      if (imageData && canvasRef.current) {
        const img = new Image()
        img.onload = () => {
          videoFrameImage.current = img
          // Триггерим перерисовку
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d')
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height)
              // Рисуем поверх данные трекинга
              if (latestData && latestData.faceDetected) {
                drawEngagementIndicator(ctx, latestData.engagement.level)
                
                // Рисуем HUD с реальными координатами
                const isDistracted = latestData.engagement.distracted || false
                if (latestData.faceLandmarks) {
                  drawFaceHUD(ctx, latestData.faceLandmarks, canvasRef.current.width, canvasRef.current.height, isDistracted)
                } else {
                  drawHeadPose(ctx, latestData.headPose, isDistracted)
                }
                
                if (latestData.blink.blinkDetected && settings.showBlinkFlash) {
                  drawBlinkIndicator(ctx)
                }
              }
            }
          }
        }
        img.src = imageData
      }
    }
    
    window.addEventListener('video-frame-update', handleVideoFrame as EventListener)
    
    return () => {
      window.removeEventListener('video-frame-update', handleVideoFrame as EventListener)
    }
  }, [latestData])

  // Визуализация данных на canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number | null = null

    const draw = () => {
      // Очистка canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!latestData) {
        // Нет данных - показываем соответствующий индикатор
        if (isTracking) {
          // Трекинг запущен - показываем ожидание (даже если cameraStatus.active еще false)
          drawWaitingIndicator(ctx, Date.now() / 1000)
          // Продолжаем анимацию
          animationFrameId = requestAnimationFrame(draw)
        } else {
          drawEmptyIndicator(ctx)
        }
        return
      }

      // КРИТИЧНО: Сначала рисуем видео кадр (если есть)
      if (videoFrameImage.current) {
        // Рисуем видео на весь canvas
        ctx.drawImage(videoFrameImage.current, 0, 0, canvas.width, canvas.height)
      } else {
        // Нет видео - рисуем фон
        ctx.fillStyle = latestData.faceDetected ? '#e8f5e9' : '#ffebee'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Затем поверх видео рисуем данные трекинга
      if (latestData && latestData.faceDetected) {
        // Визуализация вовлеченности
        drawEngagementIndicator(ctx, latestData.engagement.level)
        
        // Визуализация HUD глаз и рта (если есть координаты)
        const isDistracted = latestData.engagement.distracted || false
        if (latestData.faceLandmarks) {
          drawFaceHUD(ctx, latestData.faceLandmarks, canvas.width, canvas.height, isDistracted)
        } else {
          // Фоллбэк на статичный HUD
          drawHeadPose(ctx, latestData.headPose, isDistracted)
        }
        
        // Индикатор моргания
        if (latestData.blink.blinkDetected && settings.showBlinkFlash) {
          drawBlinkIndicator(ctx)
        }
      } else if (!videoFrameImage.current) {
        // Сообщение об отсутствии лица (только если нет видео)
        ctx.fillStyle = '#666'
        ctx.font = 'bold 20px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('Ожидание обнаружения лица...', canvas.width / 2, canvas.height / 2)
      }
    }

    draw()

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [latestData, isTracking, cameraStatus.active])

  const handleRequestCamera = async () => {
    setIsRequestingCamera(true)
    try {
      await requestCameraAccess()
    } catch (error) {
      console.error('Ошибка запроса камеры:', error)
    } finally {
      setIsRequestingCamera(false)
    }
  }

  // Показываем кнопку если:
  // - камера не инициализирована
  // - есть ошибка камеры
  // - камера инициализирована, но не активна и трекинг не запущен
  const showCameraButton = (!cameraStatus.initialized || cameraStatus.error) && !isTracking

  return (
    <div className="camera-stream">
      <div className="camera-stream__header">
        <h3>Визуализация трекинга</h3>
        <StatusIndicator status={cameraStatus} isTracking={isTracking} />
      </div>

      <div className="camera-stream__canvas-container">
        {showCameraButton && (
          <div className="camera-request-overlay">
            <div className="camera-request-content">
              <div className="camera-request-icon">📹</div>
              <h4>Доступ к камере не предоставлен</h4>
              <p>Нажмите кнопку ниже, чтобы разрешить доступ к веб-камере</p>
              <button
                onClick={handleRequestCamera}
                disabled={isRequestingCamera}
                className="camera-request-button"
              >
                {isRequestingCamera ? '⏳ Запрос...' : '📹 Разрешить доступ к камере'}
              </button>
              {cameraStatus.error && (
                <p className="camera-request-error">Ошибка: {cameraStatus.error}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Переключатель индикатора моргания */}
        <div className="blink-indicator-toggle">
          <button
            onClick={handleBlinkFlashToggle}
            className={`blink-toggle-btn ${settings.showBlinkFlash ? 'blink-toggle-btn--active' : ''}`}
            title={settings.showBlinkFlash ? 'Отключить индикатор моргания' : 'Включить индикатор моргания'}
          >
            <span className="blink-toggle-icon">👁️</span>
          </button>
        </div>
        
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={480}
          className="camera-stream__canvas"
        />
      </div>
    </div>
  )
}

// Компонент индикатора статуса
interface StatusIndicatorProps {
  status: { initialized: boolean; active: boolean; error?: string }
  isTracking: boolean
}

function StatusIndicator({ status, isTracking }: StatusIndicatorProps) {
  const getStatusText = () => {
    if (status.error) return `Ошибка: ${status.error.substring(0, 20)}...`
    if (!status.initialized) return 'Инициализация...'
    if (isTracking && status.active) return '🟢 Активен'
    if (isTracking && !status.active) return '🟡 Запуск камеры...'
    return '⏸️ Остановлен'
  }

  const getStatusClass = () => {
    if (status.error) return 'status--error'
    if (isTracking) return 'status--active'
    return 'status--inactive'
  }

  return (
    <div className={`status-indicator ${getStatusClass()}`}>
      {getStatusText()}
    </div>
  )
}

// Функции визуализации
function drawEngagementIndicator(ctx: CanvasRenderingContext2D, level: number) {
  const x = 50
  const y = 50
  const width = 200
  const height = 30

  // Фон
  ctx.fillStyle = '#e0e0e0'
  ctx.fillRect(x, y, width, height)

  // Заполнение
  const fillWidth = (level / 100) * width
  ctx.fillStyle = getEngagementColor(level)
  ctx.fillRect(x, y, fillWidth, height)

  // Текст
  ctx.fillStyle = '#000'
  ctx.font = '14px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(`Вовлеченность: ${Math.round(level)}%`, x, y - 5)
}

// HUD с реальными координатами лица
function drawFaceHUD(
  ctx: CanvasRenderingContext2D, 
  landmarks: import('@/shared/types/tracking.types').FaceLandmarksData,
  canvasWidth: number,
  canvasHeight: number,
  isDistracted: boolean = false
) {
  // Конвертируем относительные координаты (0-1) в пиксели
  const leftEyeX = landmarks.leftEye.x * canvasWidth
  const leftEyeY = landmarks.leftEye.y * canvasHeight
  const rightEyeX = landmarks.rightEye.x * canvasWidth
  const rightEyeY = landmarks.rightEye.y * canvasHeight
  const mouthX = landmarks.mouth.x * canvasWidth
  const mouthY = landmarks.mouth.y * canvasHeight
  const mouthWidth = landmarks.mouth.width * canvasWidth
  const mouthHeight = landmarks.mouth.height * canvasHeight
  
  // Рисуем кружки на глазах
  drawEyeHUD(ctx, leftEyeX, leftEyeY, 0, isDistracted)
  drawEyeHUD(ctx, rightEyeX, rightEyeY, 0, isDistracted)
  
  // Рисуем кружок на рту
  drawMouthHUD(ctx, mouthX, mouthY, mouthWidth, mouthHeight, isDistracted)
}

// Статичный HUD (фоллбэк если нет координат)
function drawHeadPose(ctx: CanvasRenderingContext2D, pose: { yaw: number; pitch: number; roll: number }, isDistracted: boolean = false) {
  const width = ctx.canvas.width
  const height = ctx.canvas.height
  
  // Центр лица (предполагаем что лицо по центру)
  const faceCenterX = width / 2
  const faceCenterY = height / 2
  
  // Позиции для HUD элементов (относительные к размеру canvas)
  const eyeY = faceCenterY - height * 0.08  // Глаза выше центра
  const leftEyeX = faceCenterX - width * 0.08  // Левый глаз
  const rightEyeX = faceCenterX + width * 0.08  // Правый глаз
  const mouthY = faceCenterY + height * 0.12  // Рот ниже центра
  
  // Рисуем кружки
  drawEyeHUD(ctx, leftEyeX, eyeY, 0, isDistracted)
  drawEyeHUD(ctx, rightEyeX, eyeY, 0, isDistracted)
  drawMouthHUD(ctx, faceCenterX, mouthY, 40, 20, isDistracted)
}

// HUD для глаза - просто кружок
function drawEyeHUD(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isDistracted: boolean = false) {
  // Меняем цвет в зависимости от состояния отвлечения
  // Зеленый когда вовлечен, красный когда отвлечен
  
  // Внутренний светлый кружок для эффекта
  ctx.fillStyle = isDistracted 
    ? 'rgba(244, 67, 54, 0.8)'  // Белый с меньшей прозрачностью для красного
    : 'rgba(0, 255, 157, 0.7)'  // Белый для зеленого
  ctx.beginPath()
  ctx.arc(x, y, 4, 0, 2 * Math.PI)
  ctx.fill()
}

// HUD для рта - просто кружок
function drawMouthHUD(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, isDistracted: boolean = false) {
  
  // Внутренний светлый кружок для эффекта
  ctx.fillStyle = isDistracted 
  ? 'rgba(244, 67, 54, 0.8)'  // Белый с меньшей прозрачностью для красного
  : 'rgba(0, 255, 157, 0.7)'  // Белый для зеленого
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, 2 * Math.PI)
  ctx.fill()
}

function drawBlinkIndicator(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(255, 152, 0, 0.5)'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  ctx.fillStyle = '#ff9800'
  ctx.font = 'bold 48px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('👁️', ctx.canvas.width / 2, ctx.canvas.height / 2)
}

function getEngagementColor(level: number): string {
  if (level > 80) return '#4caf50' // зеленый
  if (level > 40) return '#ff9800' // оранжевый
  return '#f44336' // красный
}

function getDistractionText(reason?: 'face_not_detected' | 'looking_away' | 'head_turned'): string {
  switch (reason) {
    case 'face_not_detected':
      return 'Лицо не в кадре'
    case 'head_turned':
      return 'Голова повернута'
    case 'looking_away':
      return 'Взгляд в сторону'
    default:
      return 'Отвлечен'
  }
}

// Индикатор ожидания данных
function drawWaitingIndicator(ctx: CanvasRenderingContext2D, time: number) {
  const centerX = ctx.canvas.width / 2
  const centerY = ctx.canvas.height / 2
  
  // Фон
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  // Анимированный спиннер
  const radius = 30
  const dots = 8
  
  for (let i = 0; i < dots; i++) {
    const angle = (time * 2 + (i / dots) * Math.PI * 2) % (Math.PI * 2)
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius
    
    ctx.fillStyle = `rgba(33, 150, 243, ${0.3 + (i / dots) * 0.7})`
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  
  // Текст
  ctx.fillStyle = '#666'
  ctx.font = '16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Ожидание данных трекинга...', centerX, centerY + 60)
}

// Индикатор пустого состояния
function drawEmptyIndicator(ctx: CanvasRenderingContext2D) {
  const centerX = ctx.canvas.width / 2
  const centerY = ctx.canvas.height / 2
  
  // Фон
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  // Иконка
  ctx.fillStyle = '#ccc'
  ctx.font = '64px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('📹', centerX, centerY - 20)
  
  // Текст
  ctx.fillStyle = '#999'
  ctx.font = '16px Arial'
  ctx.fillText('Камера не активна', centerX, centerY + 40)
}


