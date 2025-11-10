// Виджет отображения статистики сессии

import { useTrackingStore } from '@/entities/tracking-session'
import { useEffect, useState } from 'react'
import './SessionStats.css'

export function SessionStats() {
  const currentSession = useTrackingStore((state) => state.currentSession)
  const isTracking = useTrackingStore((state) => state.isTracking)
  const dataHistory = useTrackingStore((state) => state.dataHistory)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Обновляем текущее время каждую секунду для live обновления
  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isTracking])

  if (!currentSession) {
    return (
      <div className="session-stats session-stats--empty">
        <div className="session-stats__empty-state">
          <div className="empty-state-icon">📊</div>
          <h3>Нет активной сессии</h3>
          <p>Начните рабочую сессию чтобы увидеть статистику</p>
        </div>
      </div>
    )
  }

  // Вычисляем текущую длительность
  const duration = isTracking 
    ? Math.floor((currentTime - currentSession.startTime) / 1000)
    : currentSession.totalDuration

  const metrics = currentSession.metrics

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м ${secs}с`
    }
    return `${minutes}м ${secs}с`
  }

  const formatPercent = (value: number) => {
    return `${Math.round(value * 10) / 10}%`
  }

  // Метрики уже правильно рассчитаны в store:
  // - timeDistracted = все время когда не смотрел в экран
  // - timeFocused = общее время сессии - timeDistracted
  // Считаем проценты ДО округления для точности
  const focusPercent = duration > 0 ? (metrics.timeFocused / duration) * 100 : 0
  const distractedPercent = duration > 0 ? (metrics.timeDistracted / duration) * 100 : 0
  
  // Округляем для отображения времени
  const distractedSeconds = Math.floor(metrics.timeDistracted)
  const focusedSeconds = Math.floor(metrics.timeFocused)

  return (
    <div className="session-stats">
      <div className="session-stats__grid">
        {/* Средняя вовлеченность */}
        <StatCard
          label="Средняя вовлеченность"
          value={formatPercent(metrics.averageEngagement)}
          color={getEngagementColor(metrics.averageEngagement)}
          isLarge
        />

        {/* Моргания */}
        <StatCard
          label="Моргания"
          value={metrics.totalBlinks.toString()}
          subtitle={`${Math.round(metrics.averageBlinkRate)}/мин`}
        />

        {/* Фокус на экране */}
        <StatCard
          label="Фокус на экране"
          value={formatTime(focusedSeconds)}
          subtitle={`${formatPercent(focusPercent)} времени`}
        />

        {/* Отвлечения */}
        <StatCard
          label="Отвлечения"
          value={formatTime(distractedSeconds)}
          subtitle={`${formatPercent(distractedPercent)} времени`}
          color={distractedPercent > 20 ? '#f44336' : undefined}
        />

        {/* Длительность сессии */}
        <StatCard
          label="Длительность сессии"
          value={formatTime(duration)}
          subtitle={isTracking ? '⏱️ В процессе' : '✓ Завершено'}
        />

        {/* Эффективность */}
        <StatCard
          label="Эффективность"
          value={formatPercent(metrics.efficiency)}
          subtitle="Фокус на экране / Длительность"
          color={getEfficiencyColor(metrics.efficiency)}
        />
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  subtitle?: string
  color?: string
  isLarge?: boolean
}

function StatCard({ label, value, subtitle, color, isLarge }: StatCardProps) {
  return (
    <div className={`stat-card ${isLarge ? 'stat-card--large' : ''}`}>
      <div className="stat-card__label">{label}</div>
      <div 
        className="stat-card__value" 
        style={{ color: color || '#4caf50' }}
      >
        {value}
      </div>
      {subtitle && (
        <div className="stat-card__subtitle">{subtitle}</div>
      )}
    </div>
  )
}

function getEngagementColor(level: number): string {
  if (level > 80) return '#4caf50' // зеленый
  if (level > 40) return '#ff9800' // оранжевый
  return '#f44336' // красный
}

function getEfficiencyColor(efficiency: number): string {
  if (efficiency > 75) return '#4caf50' // зеленый
  if (efficiency > 50) return '#ff9800' // оранжевый
  return '#f44336' // красный
}

