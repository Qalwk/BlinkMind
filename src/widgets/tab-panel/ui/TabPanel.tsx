// Виджет панели с вкладками справа

import { useState } from 'react'
import { SettingsPanel } from '@/widgets/settings-panel'
import { SessionStats } from '@/widgets/session-stats'
import { LiveStats } from '@/widgets/live-stats'
import { SessionHistory } from '@/widgets/session-history'
import { PomodoroPage } from '@/pages/pomodoro'
import './TabPanel.css'

type TabId = 'stats' | 'settings' | 'session' | 'history' | 'pomodoro'

export function TabPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('stats')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const tabs = [
    { id: 'stats' as TabId, label: '📊 Статистика', icon: '📊' },
    { id: 'pomodoro' as TabId, label: '🍅 Помодоро', icon: '🍅' },
    { id: 'settings' as TabId, label: '⚙️ Настройки', icon: '⚙️' },
    { id: 'session' as TabId, label: '📈 Итоги сессии', icon: '📈' },
    { id: 'history' as TabId, label: '📅 Итоги сессий', icon: '📅' }
  ]

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className={`tab-panel ${isCollapsed ? 'tab-panel--collapsed' : ''}`}>
      {!isCollapsed && (
        <>
          <div className="tab-panel__header">
            <div className="tab-panel__tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
                  title={tab.label}
                >
                  <span className="tab-button__icon">{tab.icon}</span>
                  <span className="tab-button__label">{tab.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleToggleCollapse}
              className="tab-panel__collapse-button"
              title="Скрыть панель"
            >
              ◀
            </button>
          </div>
          
          <div className="tab-panel__content">
            <div className={`tab-panel__tab-content ${activeTab === 'stats' ? 'tab-panel__tab-content--active' : ''}`}>
              <LiveStats />
            </div>
            <div className={`tab-panel__tab-content ${activeTab === 'pomodoro' ? 'tab-panel__tab-content--active' : ''}`}>
              <PomodoroPage />
            </div>
            <div className={`tab-panel__tab-content ${activeTab === 'settings' ? 'tab-panel__tab-content--active' : ''}`}>
              <SettingsPanel />
            </div>
            <div className={`tab-panel__tab-content ${activeTab === 'session' ? 'tab-panel__tab-content--active' : ''}`}>
              <SessionStats />
            </div>
            <div className={`tab-panel__tab-content ${activeTab === 'history' ? 'tab-panel__tab-content--active' : ''}`}>
              <SessionHistory />
            </div>
          </div>
        </>
      )}
      
      {isCollapsed && (
        <button
          onClick={handleToggleCollapse}
          className="tab-panel__expand-button"
          title="Показать панель"
        >
          ▶
        </button>
      )}
    </div>
  )
}

