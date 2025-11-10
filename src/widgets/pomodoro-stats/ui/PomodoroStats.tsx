// Виджет статистики и истории помодоро

import { usePomodoroStore } from '@/entities/pomodoro-session'
import type { CompletedPomodoro, PomodoroIntervalType } from '@/shared/types/pomodoro.types'
import './PomodoroStats.css'

export function PomodoroStats() {
  const history = usePomodoroStore((state) => state.history)
  const streakStats = usePomodoroStore((state) => state.streakStats)
  const getTodayStats = usePomodoroStore((state) => state.getTodayStats)
  const clearHistory = usePomodoroStore((state) => state.clearHistory)

  const todayStats = getTodayStats()

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    if (mins < 60) {
      return `${mins}м`
    }
    const hours = Math.floor(mins / 60)
    const remainingMins = mins % 60
    return `${hours}ч ${remainingMins}м`
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${mins}`
  }

  const getIntervalLabel = (type: PomodoroIntervalType): string => {
    if (type === 'work') return 'Работа'
    if (type === 'short-break') return 'Короткий перерыв'
    return 'Длинный перерыв'
  }

  const getIntervalIcon = (type: PomodoroIntervalType): string => {
    if (type === 'work') return '🍅'
    if (type === 'short-break') return '☕'
    return '🌴'
  }

  const handleClearHistory = () => {
    if (confirm('Вы уверены, что хотите очистить всю историю помодоро?')) {
      clearHistory()
    }
  }

  // Сортируем историю по времени (новые сверху)
  const sortedHistory = [...history].sort((a, b) => b.startTime - a.startTime)

  // Берем только последние 20 для отображения
  const recentHistory = sortedHistory.slice(0, 20)

  return (
    <div className="pomodoro-stats">
      <div className="pomodoro-stats__header">
        <h3>📊 Статистика помодоро</h3>
      </div>

      <div className="pomodoro-stats__content">
        {/* Карточки статистики */}
        <div className="pomodoro-stats__cards">
          <div className="pomodoro-stats__card pomodoro-stats__card--today">
            <span className="pomodoro-stats__card-icon">🍅</span>
            <div className="pomodoro-stats__card-value">{todayStats.completedPomodoros}</div>
            <div className="pomodoro-stats__card-label">Помодоро сегодня</div>
          </div>

          <div className="pomodoro-stats__card pomodoro-stats__card--streak">
            <span className="pomodoro-stats__card-icon">🔥</span>
            <div className="pomodoro-stats__card-value">{streakStats.currentStreak}</div>
            <div className="pomodoro-stats__card-label">Текущий стрик (дни)</div>
          </div>

          <div className="pomodoro-stats__card pomodoro-stats__card--work-time">
            <span className="pomodoro-stats__card-icon">⏱️</span>
            <div className="pomodoro-stats__card-value">{formatDuration(todayStats.totalWorkTime)}</div>
            <div className="pomodoro-stats__card-label">Работа сегодня</div>
          </div>

          <div className="pomodoro-stats__card pomodoro-stats__card--break-time">
            <span className="pomodoro-stats__card-icon">☕</span>
            <div className="pomodoro-stats__card-value">{formatDuration(todayStats.totalBreakTime)}</div>
            <div className="pomodoro-stats__card-label">Перерывы сегодня</div>
          </div>
        </div>

        {/* Детали стрика */}
        {streakStats.currentStreak > 0 && (
          <div className="pomodoro-stats__streak-section">
            <div className="pomodoro-stats__streak-header">
              <span className="pomodoro-stats__streak-icon">🔥</span>
              <h4 className="pomodoro-stats__streak-title">Статистика стрика</h4>
            </div>
            <div className="pomodoro-stats__streak-details">
              <div className="pomodoro-stats__streak-item">
                <div className="pomodoro-stats__streak-value">{streakStats.currentStreak}</div>
                <div className="pomodoro-stats__streak-label">Текущий стрик</div>
              </div>
              <div className="pomodoro-stats__streak-item">
                <div className="pomodoro-stats__streak-value">{streakStats.longestStreak}</div>
                <div className="pomodoro-stats__streak-label">Лучший стрик</div>
              </div>
            </div>
          </div>
        )}

        <div className="pomodoro-stats__divider" />

        {/* История */}
        <div className="pomodoro-stats__history">
          <div className="pomodoro-stats__history-header">
            <h4 className="pomodoro-stats__history-title">📜 История</h4>
            {history.length > 0 && (
              <button
                className="pomodoro-stats__history-clear"
                onClick={handleClearHistory}
              >
                Очистить
              </button>
            )}
          </div>

          {recentHistory.length === 0 ? (
            <div className="pomodoro-stats__empty">
              <div className="pomodoro-stats__empty-icon">🍅</div>
              <p className="pomodoro-stats__empty-text">
                Пока нет завершенных помодоро.<br />
                Начните работу, чтобы увидеть историю!
              </p>
            </div>
          ) : (
            <div className="pomodoro-stats__history-list">
              {recentHistory.map((pomodoro) => (
                <div
                  key={pomodoro.id}
                  className={`pomodoro-stats__history-item ${
                    !pomodoro.completed ? 'pomodoro-stats__history-item--incomplete' : ''
                  }`}
                >
                  <span className="pomodoro-stats__history-icon">
                    {getIntervalIcon(pomodoro.intervalType)}
                  </span>
                  <div className="pomodoro-stats__history-info">
                    <h5 className="pomodoro-stats__history-type">
                      {getIntervalLabel(pomodoro.intervalType)}
                    </h5>
                    <p className="pomodoro-stats__history-time">
                      {formatTime(pomodoro.startTime)} - {formatTime(pomodoro.endTime)}
                    </p>
                  </div>
                  <span className="pomodoro-stats__history-duration">
                    {formatDuration(pomodoro.duration)}
                  </span>
                  <span className="pomodoro-stats__history-status">
                    {pomodoro.completed ? '✓' : '⏸'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

