// Страница помодоро с таймером, настройками и статистикой

import { PomodoroTimer } from '@/widgets/pomodoro-timer'
import { PomodoroSettings } from '@/widgets/pomodoro-settings'
import { PomodoroStats } from '@/widgets/pomodoro-stats'
import './PomodoroPage.css'

export function PomodoroPage() {
  return (
    <div className="pomodoro-page">
      <div className="pomodoro-page__main">
        <div className="pomodoro-page__timer">
          <PomodoroTimer />
        </div>
        
        <div className="pomodoro-page__settings">
          <PomodoroSettings />
        </div>

        <div className="pomodoro-page__stats">
          <PomodoroStats />
        </div>
      </div>
    </div>
  )
}

