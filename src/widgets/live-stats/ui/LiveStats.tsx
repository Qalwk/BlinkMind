// Виджет статистики в реальном времени

import { useTrackingStore } from '@/entities/tracking-session'
import './LiveStats.css'

export function LiveStats() {
  const latestData = useTrackingStore((state) => state.latestData)

  const getEngagementColor = (level: number): string => {
    if (level > 80) return '#4caf50' // зеленый
    if (level > 40) return '#ff9800' // оранжевый
    return '#f44336' // красный
  }

  const getDistractionText = (reason?: 'face_not_detected' | 'looking_away' | 'head_turned'): string => {
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

  if (!latestData) {
    return (
      <div className="live-stats live-stats--empty">
        <p>Ожидание данных трекинга...</p>
      </div>
    )
  }

  return (
    <div className="live-stats">
      <div className="live-stats__grid">
        <StatCard
          label="Вовлеченность"
          value={`${Math.round(latestData.engagement.level)}%`}
          color={getEngagementColor(latestData.engagement.level)}
          subtitle={latestData.engagement.distracted ? `⚠️ ${getDistractionText(latestData.engagement.distractionReason)}` : undefined}
        />
        
        <StatCard
          label="Моргания"
          value={`${latestData.blink.blinkCount}`}
          subtitle={`${Math.round(latestData.blink.averageBlinkRate)}/мин`}
        />
        
        <StatCard
          label="Поза головы"
          value={`Y:${Math.round(latestData.headPose.yaw)}°`}
          subtitle={`P:${Math.round(latestData.headPose.pitch)}° R:${Math.round(latestData.headPose.roll)}°`}
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
}

function StatCard({ label, value, subtitle, color }: StatCardProps) {
  return (
    <div className="live-stat-card">
      <div className="live-stat-card__label">{label}</div>
      <div className="live-stat-card__value" style={{ color: color || '#2196f3' }}>
        {value}
      </div>
      {subtitle && (
        <div className="live-stat-card__subtitle">{subtitle}</div>
      )}
    </div>
  )
}

