// Виджет истории сессий с календарем

import { useState, useMemo } from 'react'
import { useSessionHistoryStore } from '@/entities/session-history'
import type { TrackingSession } from '@/shared/types/tracking.types'
import './SessionHistory.css'

export function SessionHistory() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSession, setSelectedSession] = useState<TrackingSession | null>(null)
  
  const getSessionsByDate = useSessionHistoryStore((state) => state.getSessionsByDate)
  const getSessionsByMonth = useSessionHistoryStore((state) => state.getSessionsByMonth)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Получаем все сессии за текущий месяц
  const sessionsMap = useMemo(() => {
    return getSessionsByMonth(year, month)
  }, [year, month, getSessionsByMonth])

  // Генерация календарной сетки
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1

    const days: Array<{ date: Date | null; dayNumber: number | null; isCurrentMonth: boolean }> = []

    // Дни из предыдущего месяца
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      days.push({
        date: new Date(year, month - 1, day),
        dayNumber: day,
        isCurrentMonth: false
      })
    }

    // Дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        dayNumber: day,
        isCurrentMonth: true
      })
    }

    // Дни из следующего месяца
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        dayNumber: day,
        isCurrentMonth: false
      })
    }

    return days
  }, [year, month])

  // Получить сессии для выбранной даты
  const selectedDateSessions = useMemo(() => {
    if (!selectedDate) return []
    return getSessionsByDate(selectedDate)
  }, [selectedDate, getSessionsByDate])

  // Навигация по месяцам
  function goToPreviousMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
    setSelectedSession(null)
  }

  function goToNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
    setSelectedSession(null)
  }

  // Форматирование даты для отображения
  function formatMonthYear(date: Date): string {
    const months = [
      'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
    ]
    return `${months[date.getMonth()]} ${date.getFullYear()} г.`
  }

  // Получить количество сессий для даты
  function getSessionCountForDate(date: Date | null): number {
    if (!date) return 0
    const dateKey = formatDateKey(date)
    const sessions = sessionsMap.get(dateKey) || []
    return sessions.length
  }

  // Получить цвет для даты на основе количества сессий
  function getColorForSessionCount(count: number): string {
    if (count === 0) return ''
    if (count === 1) return 'session-count-1'
    if (count === 2) return 'session-count-2'
    return 'session-count-3plus'
  }

  // Если выбрана сессия, показываем её детали
  if (selectedSession) {
    return (
      <div className="session-history">
        <SessionDetails 
          session={selectedSession} 
          onBack={() => setSelectedSession(null)} 
        />
      </div>
    )
  }

  return (
    <div className="session-history">
      <div className="calendar-navigation">
        <button onClick={goToPreviousMonth} className="nav-btn">&lt;</button>
        <span className="current-month">{formatMonthYear(currentDate)}</span>
        <button onClick={goToNextMonth} className="nav-btn">&gt;</button>
      </div>

      <div className="mini-calendar">
        <div className="weekdays-mini">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
            <div key={day} className="weekday-mini">{day}</div>
          ))}
        </div>

        <div className="days-grid-mini">
          {calendarDays.map((day, index) => {
            const sessionCount = getSessionCountForDate(day.date)
            const colorClass = getColorForSessionCount(sessionCount)
            const isSelected = selectedDate && day.date && 
              selectedDate.toDateString() === day.date.toDateString()

            return (
              <div
                key={index}
                className={`calendar-day-mini ${!day.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${colorClass}`}
                onClick={() => day.date && day.isCurrentMonth && setSelectedDate(day.date)}
              >
                <span className="day-number-mini">{day.dayNumber}</span>
                {sessionCount > 0 && day.isCurrentMonth && (
                  <span className="session-badge-mini">{sessionCount}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="sessions-list-compact">
          <h3>Сессии за {formatShortDate(selectedDate)}</h3>
          {selectedDateSessions.length === 0 ? (
            <p className="no-sessions-text">Нет сессий</p>
          ) : (
            <div className="sessions-compact">
              {selectedDateSessions.map((session) => (
                <SessionCardCompact 
                  key={session.id} 
                  session={session}
                  onClick={() => setSelectedSession(session)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Компактная карточка сессии для списка
function SessionCardCompact({ session, onClick }: { session: TrackingSession; onClick: () => void }) {
  const startTime = new Date(session.startTime)
  const endTime = session.endTime ? new Date(session.endTime) : null

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}ч ${minutes}м`
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`
    }
    return `${secs}с`
  }

  const score = Math.round(session.metrics.efficiency)

  return (
    <div className="session-card-compact" onClick={onClick}>
      <div className="session-time-compact">
        {session.isPomodoroSession && <span className="pomodoro-badge">🍅</span>}
        {formatTime(startTime)} - {endTime ? formatTime(endTime) : '...'}
      </div>
      <div className="session-info-compact">
        <span className="session-duration-compact">{formatDuration(session.totalDuration)}</span>
        <span className={`session-score-compact ${score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low'}`}>
          {score}%
        </span>
      </div>
    </div>
  )
}

// Детальная статистика сессии
function SessionDetails({ session, onBack }: { session: TrackingSession; onBack: () => void }) {
  const startTime = new Date(session.startTime)
  const endTime = session.endTime ? new Date(session.endTime) : null

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}ч ${minutes}м ${secs}с`
  }

  function formatTimeShort(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}м ${secs}с`
  }

  const score = Math.round(session.metrics.efficiency)

  return (
    <div className="session-details">
      <div className="session-details-header">
        <button onClick={onBack} className="back-button">← Назад</button>
        <h3>
          {session.isPomodoroSession && <span className="pomodoro-badge-large">🍅 </span>}
          Сессия от {formatTime(startTime)}
          {session.isPomodoroSession && session.pomodoroCount && (
            <span className="pomodoro-count-badge"> ({session.pomodoroCount} помодоро)</span>
          )}
        </h3>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card-large">
          <div className="stat-label">СРЕДНЯЯ ВОВЛЕЧЕННОСТЬ</div>
          <div className="stat-value stat-value-large">
            {session.metrics.averageEngagement.toFixed(1)}%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">МОРГАНИЯ</div>
          <div className="stat-value">{session.metrics.totalBlinks}</div>
          <div className="stat-subtitle">{session.metrics.averageBlinkRate.toFixed(1)}/мин</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">ФОКУС НА ЭКРАНЕ</div>
          <div className="stat-value">{formatTimeShort(session.metrics.timeFocused)}</div>
          <div className="stat-subtitle">{Math.round((session.metrics.timeFocused / session.totalDuration) * 100)}% времени</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">ОТВЛЕЧЕНИЯ</div>
          <div className="stat-value">{formatTimeShort(session.metrics.timeDistracted)}</div>
          <div className="stat-subtitle">{Math.round((session.metrics.timeDistracted / session.totalDuration) * 100)}% времени</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">ДЛИТЕЛЬНОСТЬ СЕССИИ</div>
          <div className="stat-value">{formatDuration(session.totalDuration)}</div>
          <div className="stat-subtitle">✓ Завершено</div>
        </div>

        <div className="stat-card stat-card-highlight">
          <div className="stat-label">ЭФФЕКТИВНОСТЬ</div>
          <div className="stat-value">{score}%</div>
          <div className="stat-subtitle">Фокус на экране / Длительность</div>
        </div>
      </div>
    </div>
  )
}

// Вспомогательные функции
function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit'
  })
}


