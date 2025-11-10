// Виджет управления рабочей сессией

import { useTrackingStore } from '@/entities/tracking-session'
import { usePomodoroStore } from '@/entities/pomodoro-session'
import { useElectronIntegration } from '@/app/providers/useElectronIntegration'
import './SessionControls.css'

export function SessionControls() {
  const currentSession = useTrackingStore((state) => state.currentSession)
  const isTracking = useTrackingStore((state) => state.isTracking)
  const startSession = useTrackingStore((state) => state.startSession)
  const stopSession = useTrackingStore((state) => state.stopSession)
  const { requestCameraAccess, isElectronMode } = useElectronIntegration()
  
  // Проверка активности помодоро
  const pomodoroTimer = usePomodoroStore((state) => state.timer)
  const isPomodoroActive = pomodoroTimer.status === 'running' || pomodoroTimer.status === 'paused'

  const handleStartSession = async () => {
    // Сначала запрашиваем камеру если нужно
    if (isElectronMode) {
      await requestCameraAccess()
    }
    // Потом запускаем сессию
    startSession()
  }

  const handleStopSession = () => {
    stopSession()
  }

  return (
    <div className="session-controls">
      <div className="session-controls__header">
        <h3>Рабочая сессия</h3>
        {currentSession && isTracking && (
          <div className="session-controls__status">
            <span className="status-indicator status-indicator--active"></span>
            <span>Активна</span>
          </div>
        )}
      </div>

      <div className="session-controls__actions">
        {!isTracking ? (
          <button 
            onClick={handleStartSession}
            className="button button--primary button--large"
          >
            <span className="button-icon">▶</span>
            Начать сессию
          </button>
        ) : (
          <button 
            onClick={handleStopSession}
            className="button button--danger button--large"
            disabled={isPomodoroActive}
          >
            <span className="button-icon">⏹</span>
            Завершить сессию
          </button>
        )}
      </div>

      {/* Заглушка если помодоро активен */}
      {isPomodoroActive && isTracking && (
        <div className="session-controls__pomodoro-notice">
          <span className="session-controls__pomodoro-icon">🍅</span>
          <div className="session-controls__pomodoro-text">
            <p className="session-controls__message">
              <strong>Режим помодоро активен</strong><br />
              Сессия управляется таймером помодоро. Завершите помодоро чтобы остановить сессию.
            </p>
          </div>
        </div>
      )}

      {currentSession && isTracking && !isPomodoroActive && (
        <div className="session-controls__info">
          <p className="session-controls__message">
            💡 Сессия активна. Статистика обновляется в реальном времени.
          </p>
        </div>
      )}

      {!isTracking && currentSession && (
        <div className="session-controls__info session-controls__info--completed">
          <p className="session-controls__message">
            ✅ Последняя сессия завершена. Смотрите статистику ниже.
          </p>
        </div>
      )}
    </div>
  )
}

