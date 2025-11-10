// Точка входа для скрытого окна трекинга
// Это окно работает ПОСТОЯННО в фоне благодаря backgroundThrottling: false

import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FaceTracker } from '@/features/face-tracking'
import { getTrackerAPI } from '@/shared/api/electron-api'
import { DEFAULT_TRACKING_SETTINGS } from '@/shared/types/tracking.types'
import type { TrackingSettings } from '@/shared/types/tracking.types'

function TrackerApp() {
  // Refs для трекера (video и canvas берем из HTML через getElementById)
  const trackerRef = useRef<FaceTracker | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [settings, setSettings] = useState<TrackingSettings>(DEFAULT_TRACKING_SETTINGS)
  const [status, setStatus] = useState<string>('Инициализация...')
  
  // Refs для видео-стриминга
  const videoFrameIntervalRef = useRef<number | null>(null)
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null)

  // Функции для управления видео-стримингом (доступны из всего компонента)
  const startVideoStreaming = () => {
    const videoElement = document.getElementById('tracker-video') as HTMLVideoElement
    const api = getTrackerAPI()
    
    if (videoFrameIntervalRef.current || !tempCtxRef.current || !videoElement) {
      console.log('[Tracker] Стриминг уже запущен или нет контекста')
      return // Уже запущено или нет контекста
    }
    
    console.log('[Tracker] Начинаю отправку кадров видео...')
    videoFrameIntervalRef.current = window.setInterval(() => {
      if (videoElement && videoElement.readyState >= 2 && videoElement.videoWidth > 0 && tempCanvasRef.current && tempCtxRef.current) {
        try {
          // Рисуем кадр из video на временный canvas
          tempCtxRef.current.drawImage(videoElement, 0, 0, tempCanvasRef.current.width, tempCanvasRef.current.height)
          // Конвертируем в изображение и отправляем
          const imageData = tempCanvasRef.current.toDataURL('image/jpeg', 0.8)
          api.sendVideoFrame(imageData)
        } catch (error) {
          console.error('[Tracker] Ошибка захвата кадра:', error)
        }
      }
    }, 100) // 10 FPS для предпросмотра
  }
  
  const stopVideoStreaming = () => {
    if (videoFrameIntervalRef.current) {
      clearInterval(videoFrameIntervalRef.current)
      videoFrameIntervalRef.current = null
      console.log('[Tracker] Остановлена отправка кадров видео')
    }
  }

  // КРИТИЧНО: Регистрируем IPC слушатели СРАЗУ, не дожидаясь инициализации
  useEffect(() => {
    const api = getTrackerAPI()
    
    console.log('[Tracker] Регистрация IPC слушателей...')
    
    // Слушатели команд от главного окна
    api.onStartTracking((newSettings) => {
      console.log('[Tracker] Команда начать трекинг', newSettings)
      
      if (!trackerRef.current) {
        console.error('[Tracker] Трекер еще не инициализирован!')
        api.sendError('Трекер еще не готов')
        return
      }
      
      const tracker = trackerRef.current
      setSettings(newSettings)
      tracker.updateSettings(newSettings)
      
      // КРИТИЧНО: Отправляем статус перед запуском
      api.sendCameraStatus({
        initialized: true,
        active: false // В процессе запуска
      })
      
      tracker.start().then(() => {
        setIsTracking(true)
        setStatus('Трекинг активен')
        console.log('[Tracker] ✅ Камера успешно запущена')
        
        // Отправляем статус что камера активна
        api.sendCameraStatus({
          initialized: true,
          active: true
        })
        
        // КРИТИЧНО: Запускаем стриминг видео
        const videoElement = document.getElementById('tracker-video') as HTMLVideoElement
        if (videoElement) {
          // Ждем когда видео будет готово
          const tryStart = () => {
            if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
              console.log('[Tracker] Видео готово, запускаем стриминг')
              startVideoStreaming()
            } else {
              console.log('[Tracker] Видео еще не готово, ждем... (readyState:', videoElement.readyState, 'width:', videoElement.videoWidth, ')')
              setTimeout(tryStart, 500)
            }
          }
          tryStart()
        } else {
          console.error('[Tracker] Видео элемент не найден!')
        }
      }).catch((error) => {
        console.error('[Tracker] ❌ Ошибка запуска камеры:', error)
        setStatus(`Ошибка запуска: ${error.message}`)
        
        // Отправляем ошибку
        api.sendCameraStatus({
          initialized: true,
          active: false,
          error: error.message || 'Ошибка запуска камеры'
        })
        api.sendError(`Ошибка запуска камеры: ${error.message}`)
      })
    })

    api.onStopTracking(() => {
      console.log('[Tracker] Команда остановить трекинг')
      if (trackerRef.current) {
        trackerRef.current.stop()
        // Останавливаем стриминг видео
        stopVideoStreaming()
        setIsTracking(false)
        setStatus('Остановлен')
      }
    })

    api.onSettingsUpdate((newSettings) => {
      console.log('[Tracker] Обновление настроек', newSettings)
      setSettings(newSettings)
      if (trackerRef.current) {
        trackerRef.current.updateSettings(newSettings)
      }
    })
    
    console.log('[Tracker] IPC слушатели зарегистрированы')
  }, [])
  
  // Инициализация трекера (отдельно от IPC)
  useEffect(() => {
    async function initializeTracker() {
      try {
        console.log('[Tracker] Начало инициализации...')
        
        // Проверка MediaPipe
        if (!window.FaceMesh) {
          setStatus('Ошибка: MediaPipe Face Mesh не загружен')
          console.error('[Tracker] MediaPipe FaceMesh не найден в window')
          console.log('[Tracker] window.FaceMesh:', window.FaceMesh)
          console.log('[Tracker] window.Camera:', window.Camera)
          
          const api = getTrackerAPI()
          api.sendError('MediaPipe не загружен')
          return
        }
        
        const api = getTrackerAPI()
        
        // КРИТИЧНО: Получаем элементы из HTML (они уже есть в tracker.html)
        const videoElement = document.getElementById('tracker-video') as HTMLVideoElement
        const canvasElement = document.getElementById('tracker-canvas') as HTMLCanvasElement

        console.log('[Tracker] Элементы:', { 
          video: !!videoElement, 
          canvas: !!canvasElement,
          videoElement,
          canvasElement
        })

        if (!videoElement || !canvasElement) {
          setStatus('Ошибка: видео или canvas элементы не найдены')
          api.sendError('Video or canvas elements not found')
          console.error('[Tracker] Элементы не найдены в DOM!')
          return
        }

        // Создание трекера
        const tracker = new FaceTracker(settings)
        trackerRef.current = tracker

        // Установка коллбэков
        tracker.setOnDataCallback((data) => {
          // Отправка данных в главное окно через IPC
          api.sendTrackerData(data)
        })

        tracker.setOnStatusCallback((cameraStatus) => {
          api.sendCameraStatus(cameraStatus)
          setStatus(cameraStatus.active ? 'Активен' : 'Остановлен')
        })

        tracker.setOnErrorCallback((error) => {
          api.sendError(error)
          setStatus(`Ошибка: ${error}`)
        })

        // Инициализация MediaPipe
        console.log('[Tracker] Инициализация FaceTracker...')
        await tracker.initialize(videoElement, canvasElement)
        console.log('[Tracker] FaceTracker инициализирован успешно')
        setStatus('Готов к запуску')
        
        // КРИТИЧНО: Инициализируем canvas для захвата кадров видео
        if (!tempCanvasRef.current) {
          tempCanvasRef.current = document.createElement('canvas')
          tempCanvasRef.current.width = 640
          tempCanvasRef.current.height = 480
          tempCtxRef.current = tempCanvasRef.current.getContext('2d')
          console.log('[Tracker] Временный canvas для видео создан')
        }
        
        // КРИТИЧНО: Сообщаем main процессу что трекер готов
        api.sendReady()
        console.log('[Tracker] ✅ Готов к работе, сигнал отправлен в main процесс')

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
        console.error('[Tracker] Ошибка инициализации:', error)
        console.error('[Tracker] Stack:', error instanceof Error ? error.stack : 'N/A')
        setStatus(`Ошибка инициализации: ${errorMessage}`)
        
        // Пытаемся отправить ошибку если API доступен
        try {
          const api = getTrackerAPI()
          api.sendError(errorMessage)
        } catch (apiError) {
          console.error('[Tracker] Не удалось отправить ошибку через API:', apiError)
        }
      }
    }

    initializeTracker()

    // Cleanup при размонтировании
    return () => {
      if (trackerRef.current) {
        trackerRef.current.stop()
      }
      // Останавливаем стриминг видео
      stopVideoStreaming()
    }
  }, [])

  // Индикатор работы (для отладки)
  // Элементы <video> и <canvas> уже есть в tracker.html, не нужно их дублировать
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: isTracking ? '#e8f5e9' : '#fff3e0'
    }}>
      <h2>🎯 Background Tracker</h2>
      <p><strong>Статус:</strong> {status}</p>
      <p><strong>Трекинг:</strong> {isTracking ? '✅ Активен' : '⏸️ Неактивен'}</p>
      <p><strong>FPS:</strong> {isTracking ? settings.fpsActive : settings.fpsBackground}</p>
      
      {/* Индикатор работы в фоне */}
      {isTracking && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#4caf50', 
          color: 'white',
          borderRadius: '4px'
        }}>
          ⚡ Трекинг работает в фоновом режиме
        </div>
      )}
      
      {/* Информация о настройках */}
      <details style={{ marginTop: '20px' }}>
        <summary>Настройки трекинга</summary>
        <pre style={{ fontSize: '12px' }}>
          {JSON.stringify(settings, null, 2)}
        </pre>
      </details>
      
      {/* Элементы video и canvas уже в HTML для MediaPipe */}
      <p style={{ fontSize: '11px', color: '#666', marginTop: '10px' }}>
        Video/Canvas элементы загружены из HTML
      </p>
    </div>
  )
}

// Монтирование приложения
const rootElement = document.getElementById('tracker-root')
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <TrackerApp />
    </StrictMode>
  )
}

