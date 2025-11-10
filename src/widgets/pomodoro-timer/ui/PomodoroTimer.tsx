// Виджет таймера помодоро с круговым прогрессом

import { usePomodoroStore } from '@/entities/pomodoro-session'
import { useTrackingStore } from '@/entities/tracking-session'
import { useElectronIntegration } from '@/app/providers/useElectronIntegration'
import type { PomodoroIntervalType } from '@/shared/types/pomodoro.types'
import './PomodoroTimer.css'

export function PomodoroTimer() {
  const timer = usePomodoroStore((state) => state.timer)
  const settings = usePomodoroStore((state) => state.settings)
  const startTimer = usePomodoroStore((state) => state.startTimer)
  const pauseTimer = usePomodoroStore((state) => state.pauseTimer)
  const resumeTimer = usePomodoroStore((state) => state.resumeTimer)
  const stopTimer = usePomodoroStore((state) => state.stopTimer)
  const skipInterval = usePomodoroStore((state) => state.skipInterval)
  const startNextInterval = usePomodoroStore((state) => state.startNextInterval)
  
  // Tracking session
  const isTracking = useTrackingStore((state) => state.isTracking)
  const startSession = useTrackingStore((state) => state.startSession)
  const cameraStatus = useTrackingStore((state) => state.cameraStatus)
  const { requestCameraAccess, isElectronMode } = useElectronIntegration()

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getIntervalLabel = (type: PomodoroIntervalType): string => {
    if (type === 'work') return 'Работа'
    if (type === 'short-break') return 'Короткий перерыв'
    return 'Длинный перерыв'
  }

  const getNextIntervalInfo = (): string => {
    if (timer.currentInterval === 'work') {
      const remaining = settings.longBreakInterval - timer.completedPomodoros
      if (remaining === 1) {
        return 'Следующий: Длинный перерыв'
      }
      return 'Следующий: Короткий перерыв'
    }
    return 'Следующий: Рабочая сессия'
  }

  const handleStart = async () => {
    // Запускаем трекинг-сессию если она еще не запущена
    if (!isTracking) {
      // Сначала запрашиваем камеру если нужно
      if (isElectronMode) {
        await requestCameraAccess()
      }
      // Запускаем трекинг-сессию
      startSession()
    }
    
    // Помечаем текущую сессию как помодоро-сессию
    const markSessionAsPomodoro = useTrackingStore.getState().markSessionAsPomodoro
    markSessionAsPomodoro()
    
    // Запускаем помодоро таймер
    startTimer()
  }

  const handlePause = () => {
    pauseTimer()
  }

  const handleResume = () => {
    resumeTimer()
  }

  const handleStop = () => {
    console.log('🛑 Остановка помодоро. Завершено помодоро:', timer.completedPomodoros)
    
    // Обновляем количество завершенных помодоро в сессии ПЕРЕД остановкой
    const markSessionAsPomodoro = useTrackingStore.getState().markSessionAsPomodoro
    markSessionAsPomodoro(timer.completedPomodoros)
    
    console.log('✅ Сессия помечена как помодоро-сессия')
    
    // Останавливаем помодоро таймер
    stopTimer()
    
    // При остановке помодоро останавливаем и трекинг-сессию
    if (isTracking) {
      console.log('📊 Останавливаем трекинг-сессию и сохраняем в историю...')
      const stopSession = useTrackingStore.getState().stopSession
      stopSession()
    } else {
      console.log('⚠️ Трекинг не активен, сессия не будет сохранена')
    }
  }

  const handleSkip = () => {
    skipInterval()
  }

  const handleStartNext = async () => {
    startNextInterval()
    
    // Если следующий интервал - работа, и трекинг не активен, запускаем его
    const nextTimer = usePomodoroStore.getState().timer
    if (nextTimer.currentInterval === 'work' && !isTracking) {
      console.log('🚀 Начинаем новую трекинг-сессию для нового помодоро')
      
      // Запрашиваем камеру если нужно
      if (isElectronMode) {
        await requestCameraAccess()
      }
      
      // Запускаем новую трекинг-сессию
      startSession()
    }
    
    // Помечаем сессию как помодоро-сессию
    const markSessionAsPomodoro = useTrackingStore.getState().markSessionAsPomodoro
    markSessionAsPomodoro()
    
    startTimer()
  }

  // Расчет прогресса для круга
  const radius = 116 // радиус круга
  const circumference = 2 * Math.PI * radius
  const progress = timer.totalTime > 0 ? timer.remainingTime / timer.totalTime : 0
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="pomodoro-timer">
      <div className="pomodoro-timer__header">
        <h2 className="pomodoro-timer__title">Помодоро</h2>
        <span className={`pomodoro-timer__interval-type pomodoro-timer__interval-type--${timer.currentInterval}`}>
          {getIntervalLabel(timer.currentInterval)}
        </span>
      </div>

      {/* Статус трекинга */}
      {timer.status === 'idle' && !isTracking && (
        <div className="pomodoro-timer__tracking-notice">
          <span className="pomodoro-timer__tracking-icon">📹</span>
          <div className="pomodoro-timer__tracking-text">
            <strong>Помодоро с трекингом фокуса</strong>
            <p>При запуске автоматически включится камера для отслеживания концентрации</p>
          </div>
        </div>
      )}

      {isTracking && (
        <div className="pomodoro-timer__tracking-active">
          <span className="pomodoro-timer__tracking-status">🟢</span>
          <div>
            <strong>Трекинг активен</strong>
            <p className="pomodoro-timer__tracking-description">
              Ваша концентрация отслеживается. Рабочее время сохраняется в итоги сессий.
            </p>
          </div>
        </div>
      )}

      {timer.status === 'completed' && (
        <div className="pomodoro-timer__completed">
          <div className="pomodoro-timer__completed-icon">✓</div>
          <h3 className="pomodoro-timer__completed-message">
            {timer.currentInterval === 'work' ? 'Отличная работа!' : 'Перерыв завершен!'}
          </h3>
          <p className="pomodoro-timer__completed-subtitle">
            {timer.currentInterval === 'work' 
              ? 'Время отдохнуть' 
              : 'Готовы продолжить работу?'}
          </p>
        </div>
      )}

      <div className="pomodoro-timer__display">
        <div className={`pomodoro-timer__circle ${timer.status === 'running' ? 'pomodoro-timer__circle--running' : ''}`}>
          <svg width="240" height="240">
            <defs>
              <linearGradient id="gradient-work" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#667eea" />
                <stop offset="100%" stopColor="#764ba2" />
              </linearGradient>
              <linearGradient id="gradient-short-break" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4caf50" />
                <stop offset="100%" stopColor="#45a049" />
              </linearGradient>
              <linearGradient id="gradient-long-break" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2196f3" />
                <stop offset="100%" stopColor="#1976d2" />
              </linearGradient>
            </defs>
            
            <circle
              className="pomodoro-timer__circle-bg"
              cx="120"
              cy="120"
              r={radius}
            />
            
            {timer.status !== 'idle' && (
              <circle
                className={`pomodoro-timer__circle-progress pomodoro-timer__circle-progress--${timer.currentInterval}`}
                cx="120"
                cy="120"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            )}
          </svg>
          
          <div className="pomodoro-timer__time">
            <div className="pomodoro-timer__time-display">
              {timer.status === 'idle' ? '--:--' : formatTime(timer.remainingTime)}
            </div>
            <div className="pomodoro-timer__time-label">
              {timer.status === 'running' && 'В процессе'}
              {timer.status === 'paused' && 'На паузе'}
              {timer.status === 'idle' && 'Готов к запуску'}
              {timer.status === 'completed' && 'Завершено'}
            </div>
          </div>
        </div>
      </div>

      <div className="pomodoro-timer__controls">
        {timer.status === 'idle' && (
          <button 
            className="pomodoro-timer__button pomodoro-timer__button--start"
            onClick={handleStart}
          >
            <span>▶</span>
            Начать
          </button>
        )}

        {timer.status === 'running' && (
          <>
            <button 
              className="pomodoro-timer__button pomodoro-timer__button--pause"
              onClick={handlePause}
            >
              <span>⏸</span>
              Пауза
            </button>
            <button 
              className="pomodoro-timer__button pomodoro-timer__button--stop"
              onClick={handleStop}
            >
              <span>⏹</span>
              Стоп
            </button>
            <button 
              className="pomodoro-timer__button pomodoro-timer__button--skip"
              onClick={handleSkip}
            >
              <span>⏭</span>
              Пропустить
            </button>
          </>
        )}

        {timer.status === 'paused' && (
          <>
            <button 
              className="pomodoro-timer__button pomodoro-timer__button--resume"
              onClick={handleResume}
            >
              <span>▶</span>
              Продолжить
            </button>
            <button 
              className="pomodoro-timer__button pomodoro-timer__button--stop"
              onClick={handleStop}
            >
              <span>⏹</span>
              Стоп
            </button>
          </>
        )}

        {timer.status === 'completed' && (
          <button 
            className="pomodoro-timer__button pomodoro-timer__button--start"
            onClick={handleStartNext}
          >
            <span>▶</span>
            {timer.currentInterval === 'work' ? 'Начать перерыв' : 'Начать работу'}
          </button>
        )}
      </div>

      {timer.currentInterval === 'work' && timer.status !== 'completed' && (
        <div className="pomodoro-timer__info">
          <p className="pomodoro-timer__completed-count">
            <strong>Завершено помодоро:</strong> {timer.completedPomodoros} / {settings.longBreakInterval}
          </p>
          <div className="pomodoro-timer__progress-indicator">
            {Array.from({ length: settings.longBreakInterval }).map((_, index) => (
              <div 
                key={index}
                className={`pomodoro-timer__progress-dot ${
                  index < timer.completedPomodoros ? 'pomodoro-timer__progress-dot--completed' : ''
                }`}
              />
            ))}
          </div>
          <p className="pomodoro-timer__next-info">
            {getNextIntervalInfo()}
          </p>
        </div>
      )}
    </div>
  )
}

