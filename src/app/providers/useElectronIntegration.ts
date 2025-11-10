// Хук для интеграции с Electron API

import { useEffect } from 'react'
import { useTrackingStore } from '@/entities/tracking-session'
import { getElectronAPI, isElectronAvailable, createMockElectronAPI } from '@/shared/api/electron-api'

export function useElectronIntegration() {
  const updateTrackingData = useTrackingStore((state) => state.updateTrackingData)
  const updateCameraStatus = useTrackingStore((state) => state.updateCameraStatus)
  const setError = useTrackingStore((state) => state.setError)
  const settings = useTrackingStore((state) => state.settings)
  const isTracking = useTrackingStore((state) => state.isTracking)

  useEffect(() => {
    // Получение API (реальный или mock для разработки)
    const api = isElectronAvailable() ? getElectronAPI() : createMockElectronAPI()

    // Подписка на данные трекинга от background окна
    api.onTrackerData((data) => {
      console.log('[IPC] Получены данные трекинга:', {
        faceDetected: data.faceDetected,
        engagement: data.engagement?.level,
        blinkCount: data.blink?.blinkCount
      })
      updateTrackingData(data)
    })
    
    // НОВОЕ: Подписка на кадры видео
    api.onVideoFrame((imageData) => {
      // Отправляем кадр в store для отображения
      // Используем специальный тип события для обновления canvas
      const event = new CustomEvent('video-frame-update', { detail: imageData })
      window.dispatchEvent(event)
    })

    // Подписка на статус камеры
    api.onCameraStatus((status) => {
      console.log('[IPC] Статус камеры обновлен:', status)
      updateCameraStatus(status)
      
      // КРИТИЧНО: Запускаем сессию ТОЛЬКО когда камера стала активна
      if (status.active && !useTrackingStore.getState().currentSession) {
        console.log('[IPC] ✅ Камера активна! Запускаем сессию трекинга')
        useTrackingStore.getState().startSession()
      }
      
      // Останавливаем сессию если камера стала неактивна
      if (!status.active && useTrackingStore.getState().currentSession) {
        console.log('[IPC] ⚠️ Камера неактивна, но сессия запущена')
        // Не останавливаем автоматически - может быть временная проблема
      }
    })

    // Подписка на ошибки
    api.onTrackerError((error) => {
      setError(error)
      console.error('[Electron] Tracker error:', error)
    })

    // Cleanup при размонтировании
    return () => {
      api.removeTrackerDataListener()
      api.removeCameraStatusListener()
      api.removeTrackerErrorListener()
      api.removeVideoFrameListener()
    }
  }, [updateTrackingData, updateCameraStatus, setError])

  // Синхронизация настроек с tracker окном
  useEffect(() => {
    if (!isElectronAvailable()) return

    const api = getElectronAPI()
    api.updateSettings(settings)
  }, [settings])

  // Управление трекингом
  const startTracking = () => {
    if (!isElectronAvailable()) {
      console.warn('[Mock] Starting tracking in browser mode')
      useTrackingStore.getState().startSession()
      return
    }

    const api = getElectronAPI()
    const currentSettings = useTrackingStore.getState().settings
    
    api.startTracking(currentSettings)
    useTrackingStore.getState().startSession()
  }

  const stopTracking = () => {
    if (!isElectronAvailable()) {
      console.warn('[Mock] Stopping tracking in browser mode')
      useTrackingStore.getState().stopSession()
      return
    }

    const api = getElectronAPI()
    api.stopTracking()
    useTrackingStore.getState().stopSession()
  }

  // Запрос доступа к камере (умная секвенция)
  const requestCameraAccess = async () => {
    if (!isElectronAvailable()) {
      // В браузерном режиме запрашиваем напрямую
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        console.log('✅ Доступ к камере получен (браузер)')
        // Останавливаем stream сразу, просто проверяем доступ
        stream.getTracks().forEach(track => track.stop())
        updateCameraStatus({
          initialized: true,
          active: false
        })
        // В браузерном режиме также запускаем сессию
        useTrackingStore.getState().startSession()
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
        const detailedError = getCameraErrorMessage(error)
        setError(`Ошибка доступа к камере: ${detailedError}`)
        updateCameraStatus({
          initialized: false,
          active: false,
          error: detailedError
        })
        console.error('❌ Ошибка доступа к камере:', error)
        return false
      }
    }

    // ПРАВИЛЬНАЯ СЕКВЕНЦИЯ: Только отправляем команду запуска, НЕ меняем состояние
    // Состояние обновится когда придет подтверждение от tracker окна
    try {
      const api = getElectronAPI()
      const currentSettings = useTrackingStore.getState().settings
      
      console.log('[Camera Request] Отправка команды запуска трекинга в tracker окно...')
      
      // Обновляем статус - показываем что идет процесс
      updateCameraStatus({
        initialized: true,
        active: false
      })
      
      // Отправляем команду запуска трекинга в tracker окно
      // НЕ вызываем startSession() здесь! Дождемся когда камера реально активна
      api.startTracking(currentSettings)
      
      console.log('[Camera Request] Команда отправлена, ожидание ответа от tracker окна...')
      
      // Состояние обновится автоматически через onCameraStatus callback
      
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setError(`Ошибка запроса камеры: ${errorMessage}`)
      updateCameraStatus({
        initialized: false,
        active: false,
        error: errorMessage
      })
      console.error('[Camera Request] ❌ Ошибка:', error)
      return false
    }
  }

  // Преобразование ошибок камеры в понятные сообщения
  function getCameraErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const name = error.name
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        return 'Доступ к камере запрещен. Разрешите доступ в настройках браузера/системы.'
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'Камера не найдена. Проверьте подключение камеры.'
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        return 'Камера занята другим приложением. Закройте другие программы с камерой.'
      }
      if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
        return 'Камера не поддерживает требуемые настройки.'
      }
      return error.message || 'Неизвестная ошибка доступа к камере'
    }
    return 'Неизвестная ошибка доступа к камере'
  }

  return {
    startTracking,
    stopTracking,
    requestCameraAccess,
    isTracking,
    isElectronMode: isElectronAvailable()
  }
}


